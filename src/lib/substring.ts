import { Location, Source } from "graphql";

export function substring(source: Source, location: Location): string {
	return source.body.substring(location.start, location.end);
}
