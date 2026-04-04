/**
 * @typedef {'GS'|'GA'|'WA'|'C'|'WD'|'GD'|'GK'|'SUB'|''} NetballPosition
 * @typedef {'GP'|'WC'|'KZN'|'EC'|'FS'|'NW'|'MP'|'LP'|'NC'|''} SAProvince
 * @typedef {'U12'|'U13'|'U14'|'U16'|'U19'|'Open'|'Senior'|''} NetballAgeGroup
 * @typedef {'goal-difference'|'goals-for'|'head-to-head'} TiebreakMethod
 * @typedef {'scheduled'|'live'|'completed'} FixtureStatus
 */

export const SPORTS = [
  { id: 'netball',    label: 'Netball',    icon: '🏐', available: true,  description: 'Full tournament management for SA high school netball' },
  { id: 'football',   label: 'Football',   icon: '⚽', available: false, description: 'Coming soon' },
  { id: 'basketball', label: 'Basketball', icon: '🏀', available: false, description: 'Coming soon' },
  { id: 'rugby',      label: 'Rugby',      icon: '🏉', available: false, description: 'Coming soon' },
  { id: 'hockey',     label: 'Hockey',     icon: '🏑', available: false, description: 'Coming soon' },
  { id: 'cricket',    label: 'Cricket',    icon: '🏏', available: false, description: 'Coming soon' },
  { id: 'athletics',  label: 'Athletics',  icon: '🏃', available: false, description: 'Coming soon' },
  { id: 'swimming',   label: 'Swimming',   icon: '🏊', available: false, description: 'Coming soon' },
];

export const NETBALL_POSITIONS = ['GS','GA','WA','C','WD','GD','GK','SUB'];
export const SA_PROVINCES = [
  { code: 'GP', name: 'Gauteng' },
  { code: 'WC', name: 'Western Cape' },
  { code: 'KZN', name: 'KwaZulu-Natal' },
  { code: 'EC', name: 'Eastern Cape' },
  { code: 'FS', name: 'Free State' },
  { code: 'NW', name: 'North West' },
  { code: 'MP', name: 'Mpumalanga' },
  { code: 'LP', name: 'Limpopo' },
  { code: 'NC', name: 'Northern Cape' },
];
export const AGE_GROUPS = ['U12','U13','U14','U16','U19','Open','Senior'];

export const POSITION_COLORS = {
  GS:  { bg: '#FEF3C7', text: '#92400E', label: 'Goal Shooter' },
  GA:  { bg: '#FEE2E2', text: '#991B1B', label: 'Goal Attack' },
  WA:  { bg: '#DBEAFE', text: '#1E40AF', label: 'Wing Attack' },
  C:   { bg: '#D1FAE5', text: '#065F46', label: 'Centre' },
  WD:  { bg: '#EDE9FE', text: '#4C1D95', label: 'Wing Defence' },
  GD:  { bg: '#FCE7F3', text: '#9D174D', label: 'Goal Defence' },
  GK:  { bg: '#E0F2FE', text: '#0C4A6E', label: 'Goal Keeper' },
  SUB: { bg: '#F3F4F6', text: '#374151', label: 'Substitute' },
};
