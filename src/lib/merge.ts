export type Merge<Target, Source> = Omit<Target, keyof Source> & Source;
