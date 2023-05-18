import { Location } from "graphql";
import { isRecord } from "./is-record";

export class ErrorWithLoc extends Error {
	loc: Location;
	cause?: Error;

	constructor(message: string, options: { loc: Location; cause?: Error }) {
		super(message);

		this.name = "ErrorWithLoc";
		this.loc = options.loc;
		this.cause = options.cause;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ErrorWithLoc);
		}
		if (this.cause) {
			if (isRecord(options.cause) && "stack" in options.cause) {
				this.stack = `${this.stack}\nCAUSE: ${options.cause.stack}`;
			}
		}
	}
}
