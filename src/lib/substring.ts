import { Location } from "graphql";

export function substring(location?: Location): string {
	return location
		? location.source.body.substring(location.start, location.end)
		: "";
}
