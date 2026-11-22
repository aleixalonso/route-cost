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
