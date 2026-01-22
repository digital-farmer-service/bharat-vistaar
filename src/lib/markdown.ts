export function stripMarkdownAndHtml(text: string): string {
    const withoutHtml = text.replace(/<[^>]*>/g, '');
    return withoutHtml
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~`#]/g, '')
      .replace(/\n\n/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
  }