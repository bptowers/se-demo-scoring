// BDR ACCESS CONTROL — Single source of truth for BDR team membership.
// To add or remove a BDR team member, only this file needs to change.
// isBdrUser() and isBdrManager() are used throughout the app to gate BDR features.

export const BDR_TEAM: Record<string, string> = {
  'lilian.chike@bigchange.com':        'Lilian Chike',
  'naomi.chew@bigchange.com':          'Naomi Chew',
  'mimi.hussain@simpro.co.uk':         'Mimi Hussain',
  'ben.hill@simpro.co.uk':             'Ben Hill',
  'dean.shehu@bigchange.com':          'Dean Shehu',
  'lewis.harkness@simpro.co.uk':       'Lewis Harkness',
  'florida.ferizolli@simprogroup.com': 'Florida Ferizolli',
  'stevie.gardiner@bigchange.com':     'Stevie Gardiner',
  'aziz.choudhury@bigchange.com':      'Aziz Choudhury',
  'benjamin.lumley@simpro.co.uk':      'Benjamin Lumley',
  'dan.otter@simpro.co.uk':            'Dan Otter',
  'roger.martin@bigchange.com':        'Roger Martin',
  'henry.killestein@simpro.co.uk':     'Henry Killestein',
  'ahmad.abdullah@bigchange.com':      'Ahmad Abdullah',
  'scott.williamson@bigchange.com':    'Scott Williamson',
  'ben.briffa@simpro.co.uk':           'Ben Briffa',
  'jack.wilson@bigchange.com':         'Jack Wilson',
  'mario.pullen@bigchange.com':        'Mario Pullen',
  'harry.etwell@simpro.co.uk':         'Harry Etwell',
  'alexander.lindsay@bigchange.com':   'Alexander Lindsay',
};

// BDR manager — can see all BDR sessions across the team
export const BDR_MANAGER = {
  email: 'dave.murphy@bigchange.com',
  name:  'Dave Murphy',
};

// BDR Dashboard managers — full team visibility in the BDR Dashboard
export const BDR_DASHBOARD_MANAGERS: string[] = [
  'dave.murphy@bigchange.com',
  'brad.towers@simprogroup.com',
  'pete.mansel@simprogroup.com',
  'david.doloboff@simpro.us',
];

export function isBdrUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() in BDR_TEAM || email.toLowerCase() === BDR_MANAGER.email;
}

export function isBdrManager(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === BDR_MANAGER.email;
}

export function isBdrDashboardManager(email: string | null | undefined): boolean {
  if (!email) return false;
  return BDR_DASHBOARD_MANAGERS.includes(email.toLowerCase());
}
