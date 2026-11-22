/* Example data only. Names and amounts are made up for the prototype, except the structure of
   quote O2611-010, which follows Uniframe's own Offerte layout. */
window.UF_DATA = {
  today: '22 Nov 2026',
  journey: ['Request', 'Calculation', 'Quote', 'Order', 'Ready to ship', 'Delivered', 'Invoiced', 'Paid'],

  projects: [
    { id: 'P2611-009', name: 'Politie KPLD', customer: 'Wallsz', site: 'Faunalaan 247, Driebergen', stage: 3, next: 'Verify quote O2611-010', value: 48210.40, open: 0, margin: 21, records: ['Mail 18 Nov', 'C2611-010 R2', 'O2611-010', '–', '–', '–', '–', '–'] },
    { id: 'P2611-002', name: 'Offices', customer: 'De Graaf Interieurbouw', site: 'Stationsplein 4, Utrecht', stage: 4, next: 'Supplier confirms glass', value: 6250.00, open: 4375.00, margin: 24, records: ['Mail 3 Nov', 'C2611-002 R3', 'O2611-002', 'V2611-003', '–', '–', 'F2611-004 (30 %)', '–'] },
    { id: 'P2611-001', name: 'Healthcare', customer: 'Bentacera', site: 'Zorgpark 12, Zeist', stage: 4, next: 'Chase supplier, 4 days late', value: 12480.00, open: 12480.00, margin: 19, records: ['Phone 30 Oct', 'C2611-001 R1', 'O2611-001', 'V2611-002', '–', '–', '–', '–'] },
    { id: 'P2610-004', name: 'Offices', customer: 'Wallsz', site: 'Kanaalweg 9, Utrecht', stage: 7, next: 'Payment 12 days overdue', value: 2250.35, open: 2250.35, margin: -3, records: ['Mail 2 Oct', 'C2610-004 R2', 'O2610-006', 'V2610-005', 'Ready 4 Nov', 'Delivered 8 Nov', 'F2610-011', '–'] },
    { id: 'P2610-003', name: 'Offices', customer: 'Inter-Fact', site: 'Weg der Verenigde Naties 1, Utrecht', stage: 8, next: 'Done', value: 9870.00, open: 0, margin: 22, records: ['Mail 1 Oct', 'C2610-003 R1', 'O2610-004', 'V2610-004', 'Ready 21 Oct', 'Delivered 24 Oct', 'F2610-009', 'Paid 7 Nov'] },
    { id: 'P2611-011', name: 'School wing B', customer: 'Bouwbedrijf Hoekstra', site: 'Lindelaan 2, Amersfoort', stage: 1, next: 'Answer 2 questions from the agent', value: 0, open: 0, margin: null, records: ['Mail 21 Nov', '–', '–', '–', '–', '–', '–', '–'] },
  ],

  /* Quote O2611-010: chapters and lines. cost = purchase + labour per unit, margin in %, sale price per unit is derived. */
  quote: {
    id: 'O2611-010', calc: 'C2611-010', rev: 'R2', project: 'P2611-009', date: '12 november 2026', valid: '12 december 2026',
    status: 'To verify',
    client: { company: 'Wallsz', attn: 'Dhr. P. Terlouw', address: 'Onbekend', email: 'paul.terlouw@wallsz.nl', salutation: 'Geachte heer Terlouw, Beste Paul,' },
    project_info: { nr: 'P2611-009', desc: 'Politie- KPLD', delivery: 'Faunalaan 247, Driebergen', subject: 'Levering systeemwanden, kozijnen en deuren' },
    sender: { contact: 'Arjan Laninga', phone: '06 53 62 86 14', email: 'arjan@uniframe.nl' },
    intro: 'Hartelijk dank voor uw aanvraag. Hierbij bieden wij u geheel vrijblijvend de levering aan van de onderstaande systeemwanden, kozijnen en deuren.',
    chapters: [
      { nr: '1.0', title: 'Systeemwanden', lines: [
        { desc: 'Systeemwand enkel glas, aluminium profiel, hoogte 3000 mm', qty: 42.5, unit: 'm1', cost: 252.00, margin: 22 },
        { desc: 'Systeemwand dicht, dubbele gipsbeplating, hoogte 3000 mm', qty: 28, unit: 'm1', cost: 158.00, margin: 22 },
        { desc: 'Aansluitprofielen en akoestische afdichting', qty: 1, unit: 'post', cost: 540.00, margin: 20 },
      ]},
      { nr: '2.0', title: 'Kozijnen en deuren', lines: [
        { desc: 'Stalen kozijn met bovenlicht, 930 × 2315 mm', qty: 9, unit: 'st', cost: 336.00, margin: 21 },
        { desc: 'Opdekdeur, HPL afwerking, RAL 9010', qty: 9, unit: 'st', cost: 244.00, margin: 21 },
        { desc: 'Hang- en sluitwerk, cilinder volgens sluitplan', qty: 9, unit: 'set', cost: 149.00, margin: 15 },
      ]},
      { nr: '3.0', title: 'Montage en transport', lines: [
        { desc: 'Montage systeemwanden en kozijnen', qty: 96, unit: 'uur', cost: 47.50, margin: 20 },
        { desc: 'Transport en afvoer verpakking', qty: 1, unit: 'post', cost: 0, margin: 20 },
      ]},
    ],
    files: [
      { name: 'Tekening begane grond.pdf', from: 'Wallsz, 18 Nov', by: 'customer' },
      { name: 'Deurstaat KPLD rev B.xlsx', from: 'Wallsz, 18 Nov', by: 'customer' },
    ],
    timeline: [
      ['Agent made revision R2: 9 doors instead of 8, after Paul\'s mail of 19 Nov', '20 Nov 14:02'],
      ['Agent read the door schedule and added hinge sets', '18 Nov 16:40'],
      ['Arjan set the margin on chapter 1 to 22 %', '18 Nov 15:12'],
    ],
  },

  quotes: [
    { id: 'O2611-010', customer: 'Wallsz', project: 'P2611-009 · Politie KPLD', status: ['attention', 'To verify'], sent: '–', total: null, margin: null },
    { id: 'O2611-008', customer: 'Bouwbedrijf Hoekstra', project: 'P2611-007 · Sports hall', status: ['neutral', 'Sent, no reply 14 days'], sent: '6 Nov', total: 18420.00, margin: 20 },
    { id: 'O2611-002', customer: 'De Graaf Interieurbouw', project: 'P2611-002 · Offices', status: ['profit', 'Accepted'], sent: '8 Nov', total: 6250.00, margin: 24 },
    { id: 'O2611-001', customer: 'Bentacera', project: 'P2611-001 · Healthcare', status: ['profit', 'Accepted'], sent: '2 Nov', total: 12480.00, margin: 19 },
    { id: 'O2610-007', customer: 'Kantoorgroep Noord', project: 'P2610-006 · Reception', status: ['loss', 'Rejected: price'], sent: '20 Oct', total: 7310.00, margin: 23 },
  ],
  calculations: [
    { id: 'C2611-010', rev: 'R2', customer: 'Wallsz', project: 'P2611-009 · Politie KPLD', status: ['attention', '1 line without price'], by: 'Agent, checked by Arjan', quote: 'O2611-010' },
    { id: 'C2611-011', rev: 'R1', customer: 'Bouwbedrijf Hoekstra', project: 'P2611-011 · School wing B', status: ['neutral', 'Waiting for answers'], by: 'Agent', quote: '–' },
    { id: 'C2611-008', rev: 'R1', customer: 'Bouwbedrijf Hoekstra', project: 'P2611-007 · Sports hall', status: ['profit', 'Quoted'], by: 'Arjan', quote: 'O2611-008' },
    { id: 'C2611-002', rev: 'R3', customer: 'De Graaf Interieurbouw', project: 'P2611-002 · Offices', status: ['profit', 'Quoted'], by: 'Agent, checked by Joost', quote: 'O2611-002' },
  ],
  orders: [
    { id: 'V2611-003', customer: 'De Graaf Interieurbouw', project: 'P2611-002 · Offices', status: ['active', 'In production'], delivery: 'Week 51', total: 6250.00, margin: 24 },
    { id: 'V2611-002', customer: 'Bentacera', project: 'P2611-001 · Healthcare', status: ['attention', 'Waiting for supplier'], delivery: 'Week 50', total: 12480.00, margin: 19 },
    { id: 'V2610-005', customer: 'Wallsz', project: 'P2610-004 · Offices', status: ['neutral', 'Delivered'], delivery: '8 Nov', total: 2250.35, margin: -3 },
    { id: 'V2610-004', customer: 'Inter-Fact', project: 'P2610-003 · Offices', status: ['profit', 'Paid'], delivery: '24 Oct', total: 9870.00, margin: 22 },
  ],
  purchasing: [
    { id: 'I2611-006', supplier: 'Glas Centrum Nederland', for: 'V2611-002', status: ['loss', '4 days late'], due: '18 Nov', total: 3840.00 },
    { id: 'I2611-005', supplier: 'Metaalwerk Veenendaal', for: 'V2611-003', status: ['active', 'Confirmed'], due: '2 Dec', total: 1912.50 },
    { id: 'I2611-004', supplier: 'Deurenfabriek Oost', for: 'V2611-003', status: ['profit', 'Received and checked'], due: '14 Nov', total: 1104.00 },
  ],
  invoices: [
    { id: 'F2610-011', customer: 'Wallsz', for: 'V2610-005', status: ['loss', '12 days overdue'], due: '10 Nov', total: 2250.35, exact: 'Booked' },
    { id: 'F2611-004', customer: 'De Graaf Interieurbouw', for: 'V2611-003 · 30 %', status: ['neutral', 'Open'], due: '2 Dec', total: 1875.00, exact: 'Booked' },
    { id: 'F2610-009', customer: 'Inter-Fact', for: 'V2610-004', status: ['profit', 'Paid'], due: '7 Nov', total: 9870.00, exact: 'Booked' },
  ],
  relations: [
    { name: 'Wallsz', kind: 'Customer', contact: 'Paul Terlouw', city: 'Utrecht', note: ['loss', 'Payment overdue'] },
    { name: 'De Graaf Interieurbouw', kind: 'Customer', contact: 'Marloes de Graaf', city: 'Utrecht', note: ['profit', 'Pays on time'] },
    { name: 'Bentacera', kind: 'Customer', contact: 'Ruben Aalbers', city: 'Zeist', note: ['neutral', '–'] },
    { name: 'Glas Centrum Nederland', kind: 'Supplier', contact: 'Inkoop', city: 'Nieuwegein', note: ['attention', 'Late 3 of last 5'] },
    { name: 'Metaalwerk Veenendaal', kind: 'Supplier', contact: 'Henk Bos', city: 'Veenendaal', note: ['profit', 'Reliable'] },
  ],
  articles: [
    { code: 'SW-GL-30', name: 'Systeemwand enkel glas, h 3000', group: 'Systeemwanden', unit: 'm1', cost: 252.00, margin: 22, stock: '–' },
    { code: 'SW-DI-30', name: 'Systeemwand dicht, h 3000', group: 'Systeemwanden', unit: 'm1', cost: 158.00, margin: 22, stock: '–' },
    { code: 'KZ-ST-93', name: 'Stalen kozijn 930 × 2315 met bovenlicht', group: 'Kozijnen', unit: 'st', cost: 336.00, margin: 21, stock: '14 (5 reserved)' },
    { code: 'DR-HPL-93', name: 'Opdekdeur HPL RAL 9010', group: 'Deuren', unit: 'st', cost: 244.00, margin: 21, stock: '3 (low)' },
    { code: 'HS-CIL-01', name: 'Hang- en sluitwerk met cilinder', group: 'Beslag', unit: 'set', cost: 149.00, margin: 15, stock: '22' },
  ],
  inbox: [
    { from: 'Paul Terlouw, Wallsz', subject: 'RE: Politie KPLD, deur 2.14 erbij', lane: ['attention', 'Change to a quote'], done: 'Agent made C2611-010 R2', time: '19 Nov' },
    { from: 'Bouwbedrijf Hoekstra', subject: 'Aanvraag school wing B', lane: ['active', 'New request'], done: 'Project P2611-011 made, 2 questions drafted', time: '21 Nov' },
    { from: 'Glas Centrum Nederland', subject: 'Leverdatum I2611-006', lane: ['loss', 'Supplier late'], done: 'Linked to V2611-002, planning re-checked', time: '21 Nov' },
    { from: 'Marloes de Graaf', subject: 'Klacht: kras op deurblad', lane: ['attention', 'Needs a person'], done: 'Stopped: complaint, handed to Joost', time: '22 Nov' },
  ],
  activity: [
    ['Drafted 2 questions to Bouwbedrijf Hoekstra', '22 Nov 09:14', 'Open'],
    ['Made revision R2 of C2611-010 after a customer mail', '20 Nov 14:02', 'Undo'],
    ['Chased Glas Centrum Nederland about I2611-006', '21 Nov 08:30', 'Open'],
    ['Sent reminder 1 for F2610-011 to Wallsz', '20 Nov 09:00', 'Open'],
    ['Matched purchase invoice of Deurenfabriek Oost to I2611-004', '19 Nov 16:12', 'Change'],
  ],
};
