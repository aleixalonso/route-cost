export class UpstreamError extends Error {
  public constructor(service: string, status?: number) {
    super(
      `${service} request failed${status === undefined ? '' : ` (status ${status})`}.`,
    );
    this.name = 'UpstreamError';
  }
}

export function toolError(error: unknown) {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text:
          error instanceof Error ? error.message : 'Unexpected server error.',
      },
    ],
  };
}
