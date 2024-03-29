import type { Maybe } from "../jsutils/Maybe.js";

import type { ASTNode, ASTVisitor } from "graphql";
import { printBlockString } from "./blockString";
import { printString } from "./printString";
import type { ASTReducer } from "./visitor";
import { visit } from "graphql";
import { isNode } from "graphql/language/ast.js";

/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 */
export function print(ast: ASTNode): string {
	return visit(ast, printDocASTReducer as unknown as ASTVisitor);
}

const MAX_LINE_LENGTH = 80;

const printDocASTReducer: ASTReducer<string> = {
	Name: { leave: (node) => node.value },
	Variable: { leave: (node) => "$" + node.name },

	// Document

	Document: {
		leave: (node) => join(node.definitions, "\n\n"),
	},

	OperationDefinition: {
		leave(node) {
			const inlineVarDefs = wrap(
				"(",
				join(node.variableDefinitions, ", "),
				")",
			);
			const inlinePrefix = join(
				[
					node.operation,
					join([node.name, inlineVarDefs]),
					join(node.directives, " "),
				],
				" ",
			);

			// 2 = " {"
			if (inlinePrefix.length + 2 <= MAX_LINE_LENGTH) {
				// Anonymous queries with no directives or variable definitions can use
				// the query short form.
				return (
					(inlinePrefix === "query" ? "" : inlinePrefix + " ") +
					node.selectionSet
				);
			}

			const blockVarDefs = node.variableDefinitions
				? block(node.variableDefinitions, "(", ")", "")
				: "";
			const blockPrefix = join(
				[
					node.operation,
					join([node.name, blockVarDefs]),
					join(node.directives, " "),
				],
				" ",
			);

			// Anonymous queries with no directives or variable definitions can use
			// the query short form.
			return blockPrefix + " " + node.selectionSet;
		},
	},

	VariableDefinition: {
		leave: ({ variable, type, defaultValue, directives }) =>
			variable +
			": " +
			type +
			wrap(" = ", defaultValue) +
			wrap(" ", join(directives, " ")),
	},
	SelectionSet: { leave: ({ selections }) => block(selections) },

	Field: {
		leave({
			alias,
			name,
			arguments: args,
			// nullabilityAssertion,
			directives,
			selectionSet,
		}) {
			const prefix = join([wrap("", alias, ": "), name], "");
			let argsLine = prefix + wrap("(", join(args, ", "), ")");

			if (argsLine.length > MAX_LINE_LENGTH) {
				argsLine = prefix + wrap("(\n", indent(join(args, "\n")), "\n)");
			}

			return join([
				argsLine,
				// Note: Client Controlled Nullability is experimental and may be
				// changed or removed in the future.
				// nullabilityAssertion,
				wrap(" ", join(directives, " ")),
				wrap(" ", selectionSet),
			]);
		},
	},
	Argument: { leave: ({ name, value }) => name + ": " + value },

	// Nullability Modifiers

	// ListNullabilityOperator: {
	//   leave({ nullabilityAssertion }) {
	//     return join(['[', nullabilityAssertion, ']']);
	//   },
	// },

	// NonNullAssertion: {
	//   leave({ nullabilityAssertion }) {
	//     return join([nullabilityAssertion, '!']);
	//   },
	// },

	// ErrorBoundary: {
	//   leave({ nullabilityAssertion }) {
	//     return join([nullabilityAssertion, '?']);
	//   },
	// },

	// Fragments

	FragmentSpread: {
		leave: ({ name, directives }) =>
			"..." + name + wrap(" ", join(directives, " ")),
	},

	InlineFragment: {
		leave: ({ typeCondition, directives, selectionSet }) =>
			join(
				[
					"...",
					wrap("on ", typeCondition),
					join(directives, " "),
					selectionSet,
				],
				" ",
			),
	},

	FragmentDefinition: {
		leave: ({
			name,
			typeCondition,
			variableDefinitions,
			directives,
			selectionSet,
		}) =>
			// Note: fragment variable definitions are experimental and may be changed
			// or removed in the future.
			`fragment ${name}${wrap("(", join(variableDefinitions, ", "), ")")} ` +
			`on ${typeCondition} ${wrap("", join(directives, " "), " ")}` +
			selectionSet,
	},

	// Value

	IntValue: { leave: ({ value }) => value },
	FloatValue: { leave: ({ value }) => value },
	StringValue: {
		leave: ({ value, block: isBlockString }) =>
			isBlockString === true ? printBlockString(value) : printString(value),
	},
	BooleanValue: { leave: ({ value }) => (value ? "true" : "false") },
	NullValue: { leave: () => "null" },
	EnumValue: { leave: ({ value }) => value },
	ListValue: {
		leave: ({ values }) => {
			const valuesLine = "[" + join(values, ", ") + "]";

			if (valuesLine.length > MAX_LINE_LENGTH) {
				return "[\n" + indent(join(values, "\n")) + "\n]";
			}
			return valuesLine;
		},
	},
	ObjectValue: {
		leave: ({ fields }, key, parent, path, ancestors) => {
			const depth = [...ancestors, parent].filter(
				(ancestor) => isNode(ancestor) && ancestor.kind === "ObjectValue",
			).length;
			const parentKey =
				isNode(parent) && parent.kind === "ObjectField"
					? parent.name.value
					: undefined;

			const fieldsLine = "{ " + join(fields, ", ") + " }";
			const isWrapped = fieldsLine.indexOf("\n") >= 0;

			const TOP_LEVEL_DEPTH = 2;
			const INDENT = 2;
			const approximateInset =
				(depth + TOP_LEVEL_DEPTH) * INDENT + (parentKey ? parentKey.length : 0);

			return isWrapped || approximateInset + fieldsLine.length > MAX_LINE_LENGTH
				? block(fields)
				: fieldsLine;
		},
	},
	ObjectField: { leave: ({ name, value }) => name + ": " + value },

	// Directive

	Directive: {
		leave: ({ name, arguments: args }) =>
			"@" + name + wrap("(", join(args, ", "), ")"),
	},

	// Type

	NamedType: { leave: ({ name }) => name },
	ListType: { leave: ({ type }) => "[" + type + "]" },
	NonNullType: { leave: ({ type }) => type + "!" },

	// Type System Definitions

	SchemaDefinition: {
		leave: ({ description, directives, operationTypes }) =>
			wrap("", description, "\n") +
			join(["schema", join(directives, " "), block(operationTypes)], " "),
	},

	OperationTypeDefinition: {
		leave: ({ operation, type }) => operation + ": " + type,
	},

	ScalarTypeDefinition: {
		leave: ({ description, name, directives }) =>
			wrap("", description, "\n") +
			join(["scalar", name, join(directives, " ")], " "),
	},

	ObjectTypeDefinition: {
		leave: ({ description, name, interfaces, directives, fields }) =>
			wrap("", description, "\n") +
			join(
				[
					"type",
					name,
					wrap("implements ", join(interfaces, " & ")),
					join(directives, " "),
					block(fields),
				],
				" ",
			),
	},

	FieldDefinition: {
		leave: ({ description, name, arguments: args, type, directives }) =>
			wrap("", description, "\n") +
			name +
			(hasMultilineItems(args)
				? wrap("(\n", indent(join(args, "\n")), "\n)")
				: wrap("(", join(args, ", "), ")")) +
			": " +
			type +
			wrap(" ", join(directives, " ")),
	},

	InputValueDefinition: {
		leave: ({ description, name, type, defaultValue, directives }) =>
			wrap("", description, "\n") +
			join(
				[name + ": " + type, wrap("= ", defaultValue), join(directives, " ")],
				" ",
			),
	},

	InterfaceTypeDefinition: {
		leave: ({ description, name, interfaces, directives, fields }) =>
			wrap("", description, "\n") +
			join(
				[
					"interface",
					name,
					wrap("implements ", join(interfaces, " & ")),
					join(directives, " "),
					block(fields),
				],
				" ",
			),
	},

	UnionTypeDefinition: {
		leave: ({ description, name, directives, types }) =>
			wrap("", description, "\n") +
			join(
				["union", name, join(directives, " "), wrap("= ", join(types, " | "))],
				" ",
			),
	},

	EnumTypeDefinition: {
		leave: ({ description, name, directives, values }) =>
			wrap("", description, "\n") +
			join(["enum", name, join(directives, " "), block(values)], " "),
	},

	EnumValueDefinition: {
		leave: ({ description, name, directives }) =>
			wrap("", description, "\n") + join([name, join(directives, " ")], " "),
	},

	InputObjectTypeDefinition: {
		leave: ({ description, name, directives, fields }) =>
			wrap("", description, "\n") +
			join(["input", name, join(directives, " "), block(fields)], " "),
	},

	DirectiveDefinition: {
		leave: ({ description, name, arguments: args, repeatable, locations }) =>
			wrap("", description, "\n") +
			"directive @" +
			name +
			(hasMultilineItems(args)
				? wrap("(\n", indent(join(args, "\n")), "\n)")
				: wrap("(", join(args, ", "), ")")) +
			(repeatable ? " repeatable" : "") +
			" on " +
			join(locations, " | "),
	},

	SchemaExtension: {
		leave: ({ directives, operationTypes }) =>
			join(
				["extend schema", join(directives, " "), block(operationTypes)],
				" ",
			),
	},

	ScalarTypeExtension: {
		leave: ({ name, directives }) =>
			join(["extend scalar", name, join(directives, " ")], " "),
	},

	ObjectTypeExtension: {
		leave: ({ name, interfaces, directives, fields }) =>
			join(
				[
					"extend type",
					name,
					wrap("implements ", join(interfaces, " & ")),
					join(directives, " "),
					block(fields),
				],
				" ",
			),
	},

	InterfaceTypeExtension: {
		leave: ({ name, interfaces, directives, fields }) =>
			join(
				[
					"extend interface",
					name,
					wrap("implements ", join(interfaces, " & ")),
					join(directives, " "),
					block(fields),
				],
				" ",
			),
	},

	UnionTypeExtension: {
		leave: ({ name, directives, types }) =>
			join(
				[
					"extend union",
					name,
					join(directives, " "),
					wrap("= ", join(types, " | ")),
				],
				" ",
			),
	},

	EnumTypeExtension: {
		leave: ({ name, directives, values }) =>
			join(["extend enum", name, join(directives, " "), block(values)], " "),
	},

	InputObjectTypeExtension: {
		leave: ({ name, directives, fields }) =>
			join(["extend input", name, join(directives, " "), block(fields)], " "),
	},
};

/**
 * Given maybeArray, print an empty string if it is null or empty, otherwise
 * print all items together separated by separator if provided
 */
function join(
	maybeArray: Maybe<ReadonlyArray<string | undefined>>,
	separator = "",
): string {
	return maybeArray?.filter((x) => x).join(separator) ?? "";
}

/**
 * Given array, print each item on its own line, wrapped in an indented `{ }` block.
 */
function block(
	array: Maybe<ReadonlyArray<string | undefined>>,
	start = "{",
	end = "}",
	separator = "",
): string {
	return wrap(`${start}\n`, indent(join(array, `${separator}\n`)), `\n${end}`);
}

/**
 * If maybeString is not null or empty, then wrap with start and end, otherwise print an empty string.
 */
function wrap(
	start: string,
	maybeString: Maybe<string>,
	end: string = "",
): string {
	return maybeString != null && maybeString !== ""
		? start + maybeString + end
		: "";
}

function indent(str: string): string {
	return wrap("  ", str.replace(/\n/g, "\n  "));
}

function hasMultilineItems(maybeArray: Maybe<ReadonlyArray<string>>): boolean {
	// FIXME: https://github.com/graphql/graphql-js/issues/2203
	/* c8 ignore next */
	return maybeArray?.some((str) => str.includes("\n")) ?? false;
}
