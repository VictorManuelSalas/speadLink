export const PORTAL_CONFIG = {
  slug: 'speedlink',
  get url(): string {
    return `/portal/${this.slug}`;
  },
} as const;
