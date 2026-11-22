/* Example data only. Names and amounts are made up for the prototype, except the structure of
   quote O2611-010, which follows Uniframe's own Offerte layout.
   Everything is linked: a project points to its request, quote (= calculation), order, delivery note and invoices.
   The portal copies this into the browser on first load; Settings → Reset example data puts it back. */
(() => {
const L = (desc, qty, unit, cost, margin) => ({ desc, qty, unit, cost, margin });
const GLAS = q => L('Systeemwand enkel glas, aluminium profiel, hoogte 3000 mm', q, 'm1', 252.00, 22);
const DICHT = q => L('Systeemwand dicht, dubbele gipsbeplating, hoogte 3000 mm', q, 'm1', 158.00, 22);
const KOZ = q => L('Stalen kozijn met bovenlicht, 930 × 2315 mm', q, 'st', 336.00, 21);
const DEUR = q => L('Opdekdeur, HPL afwerking, RAL 9010', q, 'st', 244.00, 21);
const HANG = q => L('Hang- en sluitwerk, cilinder volgens sluitplan', q, 'set', 149.00, 20);
const MONT = q => L('Montage systeemwanden en kozijnen', q, 'uur', 47.50, 20);
const TRANS = () => L('Transport en afvoer verpakking', 1, 'post', 380.00, 20);
const SENDER = { contact: 'Arjan Laninga', phone: '06 53 62 86 14', email: 'arjan@uniframe.nl' };
const INTRO = 'Hartelijk dank voor uw aanvraag. Hierbij bieden wij u geheel vrijblijvend de levering aan van de onderstaande systeemwanden, kozijnen en deuren.';
const q = (o) => ({ rev: 'R1', intro: INTRO, sender: SENDER, files: [], timeline: [], valid: '', ...o });

window.UF_DATA = {
  today: '2026-11-22',
  journey: ['Request', 'Calculation', 'Quote', 'Order', 'Ready to ship', 'Delivered', 'Invoiced', 'Paid'],
  purchaseSteps: ['Draft', 'Sent', 'Confirmed', 'Received', 'Invoice matched', 'Paid'],

  projects: [
    { id: 'P2611-011', name: 'School wing B', customer: 'Bouwbedrijf Hoekstra', contact: 'Afdeling inkoop', email: 'inkoop@hoekstra-bouw.nl', site: 'Lindelaan 2, Amersfoort', created: '2026-11-21',
      request: { via: 'Mail', date: '2026-11-21', mail: 'd2', text: 'Voor school wing B in Amersfoort zoeken wij een prijs voor circa 60 m1 glazen systeemwand en 12 deuren. Tekening volgt.' } },
    { id: 'P2611-009', name: 'Politie KPLD', customer: 'Wallsz', contact: 'Paul Terlouw', email: 'paul.terlouw@wallsz.nl', site: 'Faunalaan 247, Driebergen', created: '2026-11-18',
      request: { via: 'Mail', date: '2026-11-18', mail: 'd6', text: 'Graag een offerte voor systeemwanden, 8 kozijnen en deuren voor het politiebureau in Driebergen. Tekening en deurstaat in de bijlage.' }, quote: 'O2611-010' },
    { id: 'P2611-007', name: 'Sports hall', customer: 'Bouwbedrijf Hoekstra', contact: 'Afdeling inkoop', email: 'inkoop@hoekstra-bouw.nl', site: 'Sportlaan 8, Amersfoort', created: '2026-10-28',
      request: { via: 'Phone', date: '2026-10-28', text: 'Telefoon met inkoop: glazen wand langs de tribune, 40 m1, en 8 deuren. Start februari.' }, quote: 'O2611-008' },
    { id: 'P2611-002', name: 'Offices', customer: 'De Graaf Interieurbouw', contact: 'Marloes de Graaf', email: 'marloes@degraaf-interieur.nl', site: 'Stationsplein 4, Utrecht', created: '2026-11-03',
      request: { via: 'Mail', date: '2026-11-03', text: 'Voor het kantoor aan het Stationsplein zoeken we 12 m1 glazen wand met 4 kozijnen en deuren.' }, quote: 'O2611-002', order: 'V2611-003' },
    { id: 'P2611-001', name: 'Healthcare', customer: 'Bentacera', contact: 'Ruben Aalbers', email: 'r.aalbers@bentacera.nl', site: 'Zorgpark 12, Zeist', created: '2026-10-30',
      request: { via: 'Phone', date: '2026-10-30', text: 'Ruben belde: behandelkamers op de eerste verdieping, glas en dicht, 6 deuren.' }, quote: 'O2611-001', order: 'V2611-002' },
    { id: 'P2610-006', name: 'Reception', customer: 'Kantoorgroep Noord', contact: 'Sanne Vermeer', email: 's.vermeer@kantoorgroepnoord.nl', site: 'Noorderpoort 3, Zwolle', created: '2026-10-14',
      request: { via: 'Mail', date: '2026-10-14', text: 'Voor onze nieuwe receptie zoeken we een glazen wand met twee deuren.' }, quote: 'O2610-007' },
    { id: 'P2610-004', name: 'Offices', customer: 'Wallsz', contact: 'Paul Terlouw', email: 'paul.terlouw@wallsz.nl', site: 'Kanaalweg 9, Utrecht', created: '2026-10-02',
      request: { via: 'Mail', date: '2026-10-02', text: 'Kleine aanpassing kantoor Kanaalweg: dichte wand van 8 m1 met 2 deuren.' }, quote: 'O2610-006', order: 'V2610-005' },
    { id: 'P2610-003', name: 'Offices', customer: 'Inter-Fact', contact: 'Kees Vos', email: 'k.vos@inter-fact.nl', site: 'Weg der Verenigde Naties 1, Utrecht', created: '2026-10-01',
      request: { via: 'Mail', date: '2026-10-01', text: 'Offerte gevraagd voor 20 m1 glazen wand met 4 kozijnen op de tweede verdieping.' }, quote: 'O2610-004', order: 'V2610-004' },
  ],

  /* A quote and its calculation are one record: the calculation is the cost view, the quote the customer view. */
  quotes: {
    'O2611-010': q({ id: 'O2611-010', calc: 'C2611-010', rev: 'R2', project: 'P2611-009', date: '2026-11-12', valid: '2026-12-12', status: 'To verify',
      client: { company: 'Wallsz', attn: 'Dhr. P. Terlouw', address: 'Onbekend', email: 'paul.terlouw@wallsz.nl', salutation: 'Geachte heer Terlouw, Beste Paul,' },
      project_info: { nr: 'P2611-009', desc: 'Politie- KPLD', delivery: 'Faunalaan 247, Driebergen', subject: 'Levering systeemwanden, kozijnen en deuren' },
      chapters: [
        { title: 'Systeemwanden', lines: [GLAS(42.5), DICHT(28), L('Aansluitprofielen en akoestische afdichting', 1, 'post', 540.00, 20)] },
        { title: 'Kozijnen en deuren', lines: [KOZ(9), DEUR(9), L('Hang- en sluitwerk, cilinder volgens sluitplan', 9, 'set', 149.00, 15)] },
        { title: 'Montage en transport', lines: [MONT(96), L('Transport en afvoer verpakking', 1, 'post', 0, 20)] }],
      files: [{ name: 'Tekening begane grond.pdf', from: 'Wallsz, 18 Nov' }, { name: 'Deurstaat KPLD rev B.xlsx', from: 'Wallsz, 18 Nov' }],
      timeline: [['Agent made revision R2: 9 doors instead of 8, after Paul\'s mail of 19 Nov', '20 Nov 14:02'], ['Agent read the door schedule and added hinge sets', '18 Nov 16:40'], ['Arjan set the margin on chapter 1 to 22 %', '18 Nov 15:12']] }),
    'O2611-008': q({ id: 'O2611-008', calc: 'C2611-008', project: 'P2611-007', date: '2026-11-06', valid: '2026-12-06', status: 'Sent', sent: '2026-11-06',
      client: { company: 'Bouwbedrijf Hoekstra', attn: 'Afdeling inkoop', address: 'Industrieweg 14, Amersfoort', email: 'inkoop@hoekstra-bouw.nl', salutation: 'Geachte heer, mevrouw,' },
      project_info: { nr: 'P2611-007', desc: 'Sports hall', delivery: 'Sportlaan 8, Amersfoort', subject: 'Glazen wand tribune en deuren' },
      chapters: [{ title: 'Systeemwanden', lines: [GLAS(40)] }, { title: 'Deuren', lines: [DEUR(8), HANG(8)] }, { title: 'Montage en transport', lines: [MONT(60), TRANS()] }],
      timeline: [['You sent the quote to Bouwbedrijf Hoekstra', '6 Nov 10:20']] }),
    'O2611-002': q({ id: 'O2611-002', calc: 'C2611-002', rev: 'R3', project: 'P2611-002', date: '2026-11-07', valid: '2026-12-07', status: 'Accepted', sent: '2026-11-08', accepted: '2026-11-10',
      client: { company: 'De Graaf Interieurbouw', attn: 'Mevr. M. de Graaf', address: 'Stationsplein 4, Utrecht', email: 'marloes@degraaf-interieur.nl', salutation: 'Beste Marloes,' },
      project_info: { nr: 'P2611-002', desc: 'Offices', delivery: 'Stationsplein 4, Utrecht', subject: 'Glazen wand met kozijnen en deuren' },
      chapters: [{ title: 'Systeemwanden', lines: [{ ...GLAS(12), margin: 24 }] }, { title: 'Kozijnen en deuren', lines: [{ ...KOZ(4), margin: 24 }, { ...DEUR(4), margin: 24 }] }, { title: 'Montage', lines: [{ ...MONT(20), margin: 24 }] }],
      timeline: [['De Graaf accepted the quote', '10 Nov 11:05'], ['You sent the quote', '8 Nov 09:12']] }),
    'O2611-001': q({ id: 'O2611-001', calc: 'C2611-001', project: 'P2611-001', date: '2026-11-01', valid: '2026-12-01', status: 'Accepted', sent: '2026-11-02', accepted: '2026-11-04',
      client: { company: 'Bentacera', attn: 'Dhr. R. Aalbers', address: 'Zorgpark 12, Zeist', email: 'r.aalbers@bentacera.nl', salutation: 'Beste Ruben,' },
      project_info: { nr: 'P2611-001', desc: 'Healthcare', delivery: 'Zorgpark 12, Zeist', subject: 'Behandelkamers eerste verdieping' },
      chapters: [{ title: 'Systeemwanden', lines: [{ ...GLAS(18), margin: 19 }, { ...DICHT(16), margin: 19 }] }, { title: 'Deuren', lines: [{ ...DEUR(6), margin: 19 }, { ...HANG(6), margin: 19 }] }, { title: 'Montage', lines: [{ ...MONT(44), margin: 19 }] }],
      timeline: [['Bentacera accepted the quote', '4 Nov 15:40']] }),
    'O2610-007': q({ id: 'O2610-007', calc: 'C2610-007', project: 'P2610-006', date: '2026-10-19', valid: '2026-11-19', status: 'Rejected', sent: '2026-10-20', rejected: 'Price: they chose a cheaper supplier',
      client: { company: 'Kantoorgroep Noord', attn: 'Mevr. S. Vermeer', address: 'Noorderpoort 3, Zwolle', email: 's.vermeer@kantoorgroepnoord.nl', salutation: 'Beste Sanne,' },
      project_info: { nr: 'P2610-006', desc: 'Reception', delivery: 'Noorderpoort 3, Zwolle', subject: 'Glazen wand receptie' },
      chapters: [{ title: 'Systeemwanden en deuren', lines: [{ ...GLAS(14), margin: 23 }, { ...DEUR(2), margin: 23 }] }, { title: 'Montage', lines: [{ ...MONT(18), margin: 23 }] }],
      timeline: [['Kantoorgroep Noord rejected the quote: price', '28 Oct 16:02']] }),
    'O2610-006': q({ id: 'O2610-006', calc: 'C2610-004', rev: 'R2', project: 'P2610-004', date: '2026-10-06', valid: '2026-11-06', status: 'Accepted', sent: '2026-10-06', accepted: '2026-10-08',
      client: { company: 'Wallsz', attn: 'Dhr. P. Terlouw', address: 'Kanaalweg 9, Utrecht', email: 'paul.terlouw@wallsz.nl', salutation: 'Beste Paul,' },
      project_info: { nr: 'P2610-004', desc: 'Offices', delivery: 'Kanaalweg 9, Utrecht', subject: 'Dichte wand met deuren' },
      chapters: [{ title: 'Wand en deuren', lines: [{ ...DICHT(8), margin: -3 }, { ...DEUR(2), margin: -3 }] }, { title: 'Montage', lines: [{ ...MONT(8), margin: -3 }] }] }),
    'O2610-004': q({ id: 'O2610-004', calc: 'C2610-003', project: 'P2610-003', date: '2026-10-03', valid: '2026-11-03', status: 'Accepted', sent: '2026-10-03', accepted: '2026-10-05',
      client: { company: 'Inter-Fact', attn: 'Dhr. K. Vos', address: 'Weg der Verenigde Naties 1, Utrecht', email: 'k.vos@inter-fact.nl', salutation: 'Beste Kees,' },
      project_info: { nr: 'P2610-003', desc: 'Offices', delivery: 'Weg der Verenigde Naties 1, Utrecht', subject: 'Glazen wand tweede verdieping' },
      chapters: [{ title: 'Systeemwanden', lines: [GLAS(20)] }, { title: 'Kozijnen', lines: [KOZ(4)] }, { title: 'Montage', lines: [MONT(30)] }] }),
  },

  orders: [
    { id: 'V2611-003', project: 'P2611-002', quote: 'O2611-002', created: '2026-11-10', week: 50, ref: 'DG-2026-221', payment: '30 % at order, 70 % on delivery' },
    { id: 'V2611-002', project: 'P2611-001', quote: 'O2611-001', created: '2026-11-04', week: 50, ref: 'BEN-2026-118', payment: '30 days after delivery' },
    { id: 'V2610-005', project: 'P2610-004', quote: 'O2610-006', created: '2026-10-08', week: 45, ref: '–', payment: '14 days after delivery', delivery: 'L2611-002' },
    { id: 'V2610-004', project: 'P2610-003', quote: 'O2610-004', created: '2026-10-05', week: 43, ref: 'IF-0932', payment: '14 days after delivery', delivery: 'L2610-004' },
  ],
  deliveries: [
    { id: 'L2611-002', order: 'V2610-005', ready: '2026-11-04', delivered: '2026-11-08', signedBy: 'P. Terlouw' },
    { id: 'L2610-004', order: 'V2610-004', ready: '2026-10-21', delivered: '2026-10-24', signedBy: 'K. Vos' },
  ],
  invoices: [
    { id: 'F2611-004', order: 'V2611-003', kind: 'Deposit', pct: 30, date: '2026-11-18', due: '2026-12-02', status: 'Sent', reminders: 0 },
    { id: 'F2610-011', order: 'V2610-005', kind: 'Final', date: '2026-10-27', due: '2026-11-10', status: 'Sent', reminders: 1 },
    { id: 'F2610-009', order: 'V2610-004', kind: 'Final', date: '2026-10-24', due: '2026-11-07', status: 'Paid', paid: '2026-11-07', reminders: 0 },
  ],
  purchases: [
    { id: 'I2611-006', supplier: 'Glas Centrum Nederland', order: 'V2611-002', step: 2, due: '2026-11-18', created: '2026-11-05', lines: [{ desc: 'Gehard glas 10 mm, op maat, 18 m1 wand', qty: 18, unit: 'm1', price: 165.00 }, { desc: 'Glas dicht-paneel, 16 m1', qty: 16, unit: 'm1', price: 54.40 }], log: [['Sent to supplier', '5 Nov'], ['Supplier confirmed 18 Nov', '6 Nov'], ['Supplier moved delivery to 2 Dec', '21 Nov']] },
    { id: 'I2611-005', supplier: 'Metaalwerk Veenendaal', order: 'V2611-003', step: 2, due: '2026-12-02', created: '2026-11-11', lines: [{ desc: 'Stalen kozijn 930 × 2315 met bovenlicht', qty: 4, unit: 'st', price: 336.00 }, { desc: 'Aluminium profielset glaswand', qty: 12, unit: 'm1', price: 47.38 }], log: [['Sent to supplier', '11 Nov'], ['Supplier confirmed 2 Dec', '12 Nov']] },
    { id: 'I2611-004', supplier: 'Deurenfabriek Oost', order: 'V2611-003', step: 4, due: '2026-11-14', created: '2026-11-10', lines: [{ desc: 'Opdekdeur HPL RAL 9010', qty: 4, unit: 'st', price: 244.00 }, { desc: 'Hang- en sluitwerk', qty: 4, unit: 'set', price: 32.00 }], log: [['Sent to supplier', '10 Nov'], ['Supplier confirmed', '10 Nov'], ['Goods received and checked', '14 Nov'], ['Purchase invoice matched', '19 Nov']] },
    { id: 'I2610-004', supplier: 'Metaalwerk Veenendaal', order: 'V2610-004', step: 5, due: '2026-10-17', created: '2026-10-06', lines: [{ desc: 'Stalen kozijn 930 × 2315 met bovenlicht', qty: 4, unit: 'st', price: 336.00 }, { desc: 'Aluminium profielset glaswand', qty: 20, unit: 'm1', price: 47.38 }], log: [['Sent', '6 Oct'], ['Confirmed', '7 Oct'], ['Received', '17 Oct'], ['Invoice matched', '20 Oct'], ['Paid', '3 Nov']] },
  ],
  suppliers: ['Glas Centrum Nederland', 'Metaalwerk Veenendaal', 'Deurenfabriek Oost'],
  supplierMail: { 'Glas Centrum Nederland': 'planning@glascentrum.nl', 'Metaalwerk Veenendaal': 'h.bos@metaalwerkveenendaal.nl', 'Deurenfabriek Oost': 'verkoop@deurenfabriekoost.nl' },

  relations: [
    { name: 'Wallsz', kind: 'Customer', contact: 'Paul Terlouw', email: 'paul.terlouw@wallsz.nl', city: 'Utrecht' },
    { name: 'De Graaf Interieurbouw', kind: 'Customer', contact: 'Marloes de Graaf', email: 'marloes@degraaf-interieur.nl', city: 'Utrecht' },
    { name: 'Bentacera', kind: 'Customer', contact: 'Ruben Aalbers', email: 'r.aalbers@bentacera.nl', city: 'Zeist' },
    { name: 'Bouwbedrijf Hoekstra', kind: 'Customer', contact: 'Afdeling inkoop', email: 'inkoop@hoekstra-bouw.nl', city: 'Amersfoort' },
    { name: 'Inter-Fact', kind: 'Customer', contact: 'Kees Vos', email: 'k.vos@inter-fact.nl', city: 'Utrecht' },
    { name: 'Kantoorgroep Noord', kind: 'Customer', contact: 'Sanne Vermeer', email: 's.vermeer@kantoorgroepnoord.nl', city: 'Zwolle' },
    { name: 'Glas Centrum Nederland', kind: 'Supplier', contact: 'Planning', email: 'planning@glascentrum.nl', city: 'Nieuwegein' },
    { name: 'Metaalwerk Veenendaal', kind: 'Supplier', contact: 'Henk Bos', email: 'h.bos@metaalwerkveenendaal.nl', city: 'Veenendaal' },
    { name: 'Deurenfabriek Oost', kind: 'Supplier', contact: 'Verkoop', email: 'verkoop@deurenfabriekoost.nl', city: 'Doetinchem' },
  ],
  articles: [
    { code: 'SW-GL-30', name: 'Systeemwand enkel glas, h 3000', group: 'Systeemwanden', unit: 'm1', cost: 252.00, margin: 22, stock: 0 },
    { code: 'SW-DI-30', name: 'Systeemwand dicht, h 3000', group: 'Systeemwanden', unit: 'm1', cost: 158.00, margin: 22, stock: 0 },
    { code: 'KZ-ST-93', name: 'Stalen kozijn 930 × 2315 met bovenlicht', group: 'Kozijnen', unit: 'st', cost: 336.00, margin: 21, stock: 14 },
    { code: 'DR-HPL-93', name: 'Opdekdeur HPL RAL 9010', group: 'Deuren', unit: 'st', cost: 244.00, margin: 21, stock: 3 },
    { code: 'HS-CIL-01', name: 'Hang- en sluitwerk met cilinder', group: 'Beslag', unit: 'set', cost: 149.00, margin: 20, stock: 22 },
  ],
  activity: [
    ['Drafted 2 questions to Bouwbedrijf Hoekstra', '22 Nov 09:14', 'agent'],
    ['Chased Glas Centrum Nederland about I2611-006', '21 Nov 08:30', 'agent'],
    ['Made revision R2 of C2611-010 after a customer mail', '20 Nov 14:02', 'agent'],
    ['Sent reminder 1 for F2610-011 to Wallsz', '20 Nov 09:00', 'agent'],
    ['Matched purchase invoice of Deurenfabriek Oost to I2611-004', '19 Nov 16:12', 'agent'],
  ],
};
})();
