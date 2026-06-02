const RUBRIC_ADMIN_EMAILS = new Set([
  'brad.towers@simprogroup.com',
  'thilo.schatz@simpro.us',
]);

export const canViewSeRubric = (email: string | null | undefined): boolean =>
  !!email && RUBRIC_ADMIN_EMAILS.has(email.toLowerCase());
