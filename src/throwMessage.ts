export const throwMessage = {
	NotFound: (id: string) => `Timer with id ${id} not found`,
	ChangeExtra: "Error when changing extra",
	FilePathinvalid: "Timer file path must be within the project directory",
	NoExtra: "Cannot create timer without extra fields in JSONL",
	InvalidLength: (length: number) => `Invalid length: ${length}`,
	InvalidSyntax: "Timer file's syntax is wrong",
	LoadTimerData: "Error when loading timer data",
	SaveTimerData: "Error when saving timer data",
	AppendTimerData: "Error when appending timer data",
};
