export class CodexResetsError extends Error {
  constructor(message, options = undefined) {
    super(message, options);
    this.name = "CodexResetsError";
  }
}
