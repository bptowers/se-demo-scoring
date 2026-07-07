// TODO: Replace placeholder emails with real manager emails when available

export interface ManagerConfig {
  name: string;
  email: string;
  region: string;
  directReports: string[];
}

/** Sentinel value — manager sees all AEs across all other managers */
export const ALL_AES_SENTINEL = '__ALL__';

export const MANAGERS: ManagerConfig[] = [
  { name: 'Alex Shepherd',          email: 'alex.shepherd@bigchange.com',          region: 'BigChange UK',   directReports: ['Arab Ismail', 'Edan Poole', 'Ellie Sufrin', 'Ellis Whelan', 'Emilio Lavia', 'Harris Tariq', 'Matthew Fryer', 'Oliver Abrahamson', 'Robert Johnson', 'Ryan Oliver'] },
  { name: 'Simon Tushingham Jones', email: 'simon.tusinghamjones@simprogroup.com', region: 'Simpro Group UK', directReports: ['Calum Radcliffe', 'David Taylor', 'Dom George', 'Jake Beattie', 'Lydia Brown', 'Marco Marques', 'Mark Rees', 'Ricky Campitelli', 'Simon Heath', 'Steven Crake', 'Theo Webster', 'Thomas Bennett'] },
  { name: 'Stewart McLellan',       email: 'stewart.mclellan@simpro.co.uk',        region: 'Simpro Group UK', directReports: ['Calum Radcliffe', 'David Taylor', 'Dom George', 'Jake Beattie', 'Lydia Brown', 'Marco Marques', 'Mark Rees', 'Ricky Campitelli', 'Simon Heath', 'Steven Crake', 'Theo Webster', 'Thomas Bennett'] },
  { name: 'Mike Langley',           email: 'mike.langley@simpro.com',              region: 'Simpro Group US', directReports: ['Anais Calderon', 'Andrew Bessette', 'Bo Schumacher', 'Brad Lewis', 'Chris Karns', 'David Stevens', 'Hector Weston Maestro Gomez', 'Henry Colwell', 'Jake Savage', 'Joey Commons', 'Kevin O\'Brien', 'Kyle Byars', 'Liam Farrell'] },
  { name: 'Daniel Metcalf',         email: 'daniel.metcalf@clockshark.com',        region: 'ClockShark',     directReports: ['Brendan Johns', 'Brian Conry', 'David Nelson', 'Kevin Barry', 'Lianna Banyasz', 'Liz Ruiz', 'Lucas Halligan', 'Max Sciarini', 'Nicholas Mascelli', 'Tyler Atmore'] },
  { name: 'Justin Barlow',          email: 'justin.barlow@simpro.com.au',          region: 'Simpro Group AU', directReports: ['Ash Parrot', 'Calum Griffin', 'Daryus Aden', 'Jean Bouzeid', 'Jonathan Barrett', 'Justin Billie'] },
  { name: 'Milan Kumar',            email: 'milan.kumar@simpro.com',               region: 'Simpro Group NZ', directReports: ['Brian Burke', 'Dan Farinelli', 'Nick Opasinis', 'Nikhil Kalluri', 'Stephen Hasset'] },
  // Global access — sees all AEs across all regions
  { name: 'Pete Mansel',            email: 'pete.mansel@simpro.com',               region: 'Global',         directReports: [ALL_AES_SENTINEL] },
  { name: 'Thilo Schatz',           email: 'thilo.schatz@simpro.us',               region: 'Global',         directReports: [ALL_AES_SENTINEL] },
  { name: 'Michael Weinberg',       email: 'michael.weinberg@simpro.com',          region: 'Simpro Group AU', directReports: ['Gabrielle Coakley', 'Joshua Leszko', 'Kate Rothenbuecher', 'Kieran Davies', 'Leone Southton', 'Mark Bentley', 'Tien Trinh'] },
  { name: 'Jason Smith',            email: 'jason.smith@simprogroup.com',          region: 'Global',         directReports: ['Rob Inman', 'Rob Greer', 'Rob Sanders', 'Amer Sharief', 'Sheryl Bacor', 'Heather Maxwell', 'Melissa Jones'] },
  // Global access — sees all AEs across all regions
  { name: 'Brad Towers',            email: 'brad.towers@simprogroup.com',          region: 'Global',         directReports: [ALL_AES_SENTINEL] },
  { name: 'Fred Voccola',           email: 'fred.voccola@simprogroup.com',         region: 'Global',         directReports: [ALL_AES_SENTINEL] },
  { name: 'Frank Tisellano',        email: 'frank.tisellano@simprogroup.com',      region: 'Global',         directReports: [ALL_AES_SENTINEL] },
];

export const getManagerConfig = (email: string | null | undefined): ManagerConfig | null =>
  MANAGERS.find(m => m.email === email?.toLowerCase()) ?? null;

/**
 * Returns the effective direct reports for a manager.
 * Managers with ALL_AES_SENTINEL get a deduplicated union of all other managers' AEs.
 */
export function getDirectReports(config: ManagerConfig): string[] {
  if (!config.directReports.includes(ALL_AES_SENTINEL)) return config.directReports;
  const all = MANAGERS
    .filter(m => !m.directReports.includes(ALL_AES_SENTINEL))
    .flatMap(m => m.directReports);
  return [...new Set(all)];
}
