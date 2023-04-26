import { expect, test } from "vitest";
import { splitLines } from "../split-lines";

test("should split newlines", () => {
	const lines = splitLines("ab\ncdefgh\nijk");

	expect(lines.length).toBe(3);
	expect(lines[0].kind).toBe("String");
	expect(lines[0].value).toBe("ab");
	expect(lines[1].kind).toBe("String");
	expect(lines[1].value).toBe("cdefgh");
	expect(lines[2].kind).toBe("String");
	expect(lines[2].value).toBe("ijk");
});

test("should split carriage-returns", () => {
	const lines = splitLines("ab\r\ncdefgh\r\nijk");

	expect(lines.length).toBe(3);
	expect(lines[0].kind).toBe("String");
	expect(lines[0].value).toBe("ab");
	expect(lines[1].kind).toBe("String");
	expect(lines[1].value).toBe("cdefgh");
	expect(lines[2].kind).toBe("String");
	expect(lines[2].value).toBe("ijk");
});

test("should split mixed", () => {
	const lines = splitLines("ab\r\ncdefgh\nijk\r\nlm\nno\n");

	expect(lines.length).toBe(6);
	expect(lines[0].kind).toBe("String");
	expect(lines[0].value).toBe("ab");
	expect(lines[1].kind).toBe("String");
	expect(lines[1].value).toBe("cdefgh");
	expect(lines[2].kind).toBe("String");
	expect(lines[2].value).toBe("ijk");
	expect(lines[3].kind).toBe("String");
	expect(lines[3].value).toBe("lm");
	expect(lines[4].kind).toBe("String");
	expect(lines[4].value).toBe("no");
	expect(lines[5].kind).toBe("String");
	expect(lines[5].value).toBe("");
});
