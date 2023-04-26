import { GraphQLError } from "graphql";

export function isGraphQLError(error: unknown): error is GraphQLError {
	return (
		typeof error === "object" &&
		error != null &&
		"name" in error &&
		error.name === "GraphQLError"
	);
}

const SYNTAX_ERROR = /^Syntax Error:/;

export function isSyntaxError(error: unknown): error is GraphQLError {
	return isGraphQLError(error) && SYNTAX_ERROR.test(error.message);
}
