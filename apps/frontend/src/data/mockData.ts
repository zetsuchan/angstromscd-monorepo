import { Thread, Message, Citation, Alert, Workspace } from '../types';

export const workspaces: Workspace[] = [
  { id: '1', name: 'Global' },
  { id: '2', name: 'Project X' },
  { id: '3', name: 'My Papers' },
];

export const mockThreads: Thread[] = [
  {
    id: '1',
    name: 'Main',
    isActive: true,
    messages: [
      {
        id: '1',
        content: 'What is the current consensus on Hydroxyurea dosing for pediatric sickle cell patients?',
        sender: 'user',
        timestamp: new Date('2024-05-15T10:30:00'),
      },
      {
        id: '2',
        content: 'The current consensus for Hydroxyurea dosing in pediatric sickle cell disease (SCD) favors an initial dose of 20mg/kg/day with subsequent escalation to maximum tolerated dose (MTD) based on hematologic parameters. Several studies have shown improved clinical outcomes with this approach compared to fixed lower dosing.',
        sender: 'ai',
        timestamp: new Date('2024-05-15T10:31:00'),
        citations: [
          {
            id: '1',
            reference: 'Ware et al. (2017)',
            snippet: 'In the TWiTCH trial, escalation to MTD showed superior TCD velocity reduction compared to transfusions.',
            source: 'PMID: 28700545',
          },
          {
            id: '2',
            reference: 'McGann et al. (2019)',
            snippet: 'Higher HU doses (MTD strategy) correlated with higher HbF induction and decreased VOE frequency.',
            source: 'DOI: 10.1182/blood-2019-05-871996',
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Hb F Induction',
    isActive: false,
    messages: [],
  },
  {
    id: '3',
    name: 'VOE Risk',
    isActive: false,
    messages: [],
  },
];

export const recentAlerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    content: 'VOE risk',
    isRead: false,
  },
  {
    id: '2',
    type: 'info',
    content: 'New PubMed hits (5)',
    isRead: false,
  },
];

export const statusIndicator = {
  vectorDb: {
    status: 'synced',
    timeAgo: '2 min ago',
  },
  fhir: {
    status: 'connected',
    connection: 'FHIR sandbox',
  },
};

export const latestLiterature = 'New meta-analysis shows promising results for gene therapy in β-thalassemia';