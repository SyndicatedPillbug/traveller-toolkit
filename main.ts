const { Plugin, ItemView, Notice, PluginSettingTab, Setting, MarkdownView, normalizePath } = require('obsidian');

const VIEW_TYPE_TRAVELLER_TOOLKIT = 'traveller-toolkit-view';
const HEX = '0123456789ABCDEF';
const STARPORTS = { A: 'Excellent', B: 'Good', C: 'Routine', D: 'Poor', E: 'Frontier', X: 'No starport' };
const ATMOSPHERES = { 0: 'None', 1: 'Trace', 2: 'Very thin, tainted', 3: 'Very thin', 4: 'Thin, tainted', 5: 'Thin', 6: 'Standard', 7: 'Standard, tainted', 8: 'Dense', 9: 'Dense, tainted', 10: 'Exotic', 11: 'Corrosive', 12: 'Insidious', 13: 'Dense, high', 14: 'Thin, low', 15: 'Unusual' };
const GOVERNMENTS = { 0: 'None', 1: 'Company/corporation or family/clan', 2: 'Participating democracy', 3: 'Self-perpetuating oligarchy', 4: 'Representative democracy', 5: 'Feudal technocracy', 6: 'Captive government / colony', 7: 'Balkanized', 8: 'Civil service bureaucracy', 9: 'Impersonal bureaucracy', 10: 'Charismatic dictator', 11: 'Non-charismatic dictator', 12: 'Charismatic oligarchy', 13: 'Religious dictatorship', 14: 'Religious autocracy', 15: 'Totalitarian oligarchy' };
const BASE_OPTIONS = ['Naval', 'Scout', 'Research', 'Corporate', 'Military', 'Pirate', 'Ancient Site'];
const BASE_CODES = { 'Naval': 'N', 'Scout': 'S', 'Research': 'R', 'Corporate': 'C', 'Military': 'M', 'Pirate': 'P', 'Ancient Site': 'A' };
const TRAVEL_ZONES = ['Green', 'Amber', 'Red'];
const DEFAULT_ALLEGIANCES = ['Independent', 'Sallowfall Holdings', 'Corporate Client', 'Port League', 'Autocracy', 'Frontier Autonomous', 'Disputed', 'Unclaimed'];
const NAME_STYLES = {
  'Frontier Anglo': { consonants: 'bcdfghjklmnprstvwxyz', vowels: 'aeiou', chunks: ['br','cr','dr','fr','gr','kr','st','th','tr','vr','ll','nd','rn','sh'], patterns: ['CVCVC','CVCCV','CVCVCV','S-CVC','CVDCV'], suffixes: 'fall, mere, reach, hold, gate, cross, well, mark, port, drift, hollow, light' },
  'Corporate Polished': { consonants: 'bcdfghklmnprstvz', vowels: 'aeiouy', chunks: ['sol','ver','cor','hal','san','mer','vel','lux','nov','ter'], patterns: ['S-CVC','CVCVC','DVC','CVDV','D-CVC'], suffixes: 'Prime, Station, Prospect, Landing, Exchange, Hub, Annex, Platform, Yard, Preserve' },
  'Autocracy Formal': { consonants: 'bcdfghklmnprstvxz', vowels: 'aeiou', chunks: ['kar','vor','zar','kaz','drev','ost','morn','vhal','sk','zh'], patterns: ['DVC','CVDVC','S-DV','CVC-D','DVCCV'], suffixes: 'Crown, Bastion, Redoubt, Throne, Vigil, Command, Citadel, March, Keep, Terminus' },
  'Ancient / Ruinous': { consonants: 'bcdfghklmnqrstvwxyz', vowels: 'aeiouaaeeo', chunks: ['ul','oth','esh','aun','ith','or','kh','qir','zen','uur'], patterns: ['DVCV','CVDS','S-D','D-DV','VCVD'], suffixes: 'Vault, Reliquary, Echo, Scar, Silence, Deep, Ossuary, Crown, Memory, Shard' },
  'Sparse Rim': { consonants: 'bcdfghjklmnprstvwxyz', vowels: 'aeiou', chunks: ['k','r','t','m','n','v','s','d','l','gr'], patterns: ['CVC','CVVC','S','CVD','VCVC'], suffixes: 'Rock, End, Spur, Pit, Gap, Ice, Well, Dust, Rest, Cut' }
};
const DEFAULT_SETTINGS = {
  systemFolder: 'Systems',
  systemIndexFile: '_{name}.md',
  createMainworldNote: false,
  createSupportNotes: false,
  defaultAllegiance: 'Independent',
  defaultAllegianceCode: 'In',
  allegianceList: DEFAULT_ALLEGIANCES.join('\n'),
  defaultNameSeed: 'Ardress',
  defaultNameStyle: 'Frontier Anglo',
  defaultStatus: 'stub',
  defaultProminence: 'minor',
  createNoteTemplate: true,
  subsectorColumns: 10,
  subsectorRows: 16
};

const FIELD_HELP = {
  'Hex': 'Four-digit subsector coordinate, such as 0609. This is the system location on the map.',
  'Mainworld Name': 'The named mainworld for the system. The system folder will use this name too.',
  'Allegiance': 'Who claims or dominates the system. Use the readable name here; the code is stored separately for map/export use.',
  'Allegiance Code': 'Short compact code used in map lines or exports, such as In, SaHo, or Aut.',
  'Travel Zone': 'Green is normal, Amber is caution/restricted, Red is interdicted or very dangerous.',
  'Starport': 'Best generally available starport in the system, not necessarily the downport on the mainworld.',
  'Size': 'Mainworld size code. 0 is asteroid/small body; 8 is roughly Earth-sized.',
  'Atmosphere': 'Mainworld atmosphere code. This strongly affects habitability and gear requirements.',
  'Hydrographics': 'Surface water coverage code. 0 is dry; A/10 is water world.',
  'Population': 'Population exponent code. 6 means millions, 9 means billions, A means tens of billions.',
  'Government': 'Broad government type code. Treat it as a prompt, not a straightjacket.',
  'Law': 'How restrictive the local law is, especially around weapons, armor, contraband, and surveillance.',
  'Tech Level': 'Local technology base. This affects repairs, equipment availability, medicine, and industry.',
  'PBG': 'Population multiplier, belts, gas giants. Example 712 means multiplier 7, one belt, two gas giants.',
  'Stellar': 'Primary star or stellar notation, such as G2 V or M1 V M8 D.',
  'World Count': 'Number of significant worlds/bodies in the system record.',
  'Importance': 'Referee-facing importance score. Higher systems matter more economically, politically, or strategically.',
  'Route Role': 'Plain-English route function, such as backwater, minor hub, choke point, or frontier stop.',
  'Fuel Sources': 'Comma-separated fuel sources, such as refined fuel, gas giant, oceans, ice belt.',
  'Starport Location': 'Where the main port is: highport, downport, orbital, mainworld, moon, belt station, etc.',
  'Downport': 'Optional description/code for the surface port if it differs from the system starport.',
  'Facilities': 'Short note about repairs, shipyards, berths, refined fuel, brokers, or restrictions.'
};
function helpFor(label) { return FIELD_HELP[label] || ''; }

function d6() { return Math.floor(Math.random() * 6) + 1; }
function roll2d() { return d6() + d6(); }
function clamp(n, low = 0, high = 15) { n = parseInt(String(n), 10); if (Number.isNaN(n)) n = 0; return Math.max(low, Math.min(high, n)); }
function hx(n) { return HEX[clamp(n)]; }
function cleanList(text) { return String(text || '').split(',').map(x => x.trim()).filter(Boolean); }
function pick(arr, rand = Math.random) { return arr[Math.floor(rand() * arr.length)]; }
function safeJsonArray(arr) { return `[${arr.map(x => `"${String(x).replace(/"/g, '\\"')}"`).join(', ')}]`; }
function yamlString(s) { return String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
function titleCaseName(name) { return String(name).replace(/\s+/g, ' ').trim().split(/([\s-]+)/).map(part => /[\s-]+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(''); }
function seedSyllables(seedText) { const cleaned = String(seedText || 'Ardress').toLowerCase().replace(/[^a-z]/g, ''); const chunks = []; for (let i = 0; i < cleaned.length; i += 2) chunks.push(cleaned.slice(i, i + 3)); chunks.push(cleaned.slice(0, 3), cleaned.slice(-3)); return chunks.filter(x => x && x.length >= 2); }
function seededRandom(seedText) { let h = 2166136261; for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); } return function() { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buildNameFromPattern(pattern, style, seedText, rand) { const syllables = seedSyllables(seedText); let out = ''; for (const ch of pattern) { if (ch === 'C') out += pick(style.consonants.split(''), rand); else if (ch === 'V') out += pick(style.vowels.split(''), rand); else if (ch === 'D') out += pick(style.chunks, rand); else if (ch === 'S') out += pick(syllables.length ? syllables : ['ar','dre','ess'], rand); else out += ch; } return out.replace(/([aeiou])\1\1+/g, '$1$1').replace(/([bcdfghjklmnpqrstvwxyz])\1\1+/g, '$1$1'); }
function rollStarport(pop) { let r = roll2d(); if (pop >= 8) r += 1; if (pop <= 3) r -= 1; if (r <= 4) return 'X'; if (r <= 6) return 'E'; if (r <= 8) return 'D'; if (r <= 10) return 'C'; if (r === 11) return 'B'; return 'A'; }
function deriveTradeCodes(size, atm, hydro, pop, gov, law, tl) { const codes = []; if (atm >= 4 && atm <= 9 && hydro >= 4 && hydro <= 8 && pop >= 5 && pop <= 7) codes.push('Ag'); if (size === 0 && atm === 0 && hydro === 0) codes.push('As'); if (pop === 0 && gov === 0 && law === 0) codes.push('Ba'); if (atm >= 2 && hydro === 0) codes.push('De'); if (atm >= 10 && atm <= 12 && hydro >= 1) codes.push('Fl'); if (size >= 6 && size <= 8 && [5,6,8].includes(atm) && hydro >= 5 && hydro <= 7) codes.push('Ga'); if (pop >= 9) codes.push('Hi'); if (tl >= 12) codes.push('Ht'); if ([0,1].includes(atm) && hydro >= 1) codes.push('Ic'); if ([0,1,2,4,7,9].includes(atm) && pop >= 9) codes.push('In'); if (pop > 0 && pop <= 3) codes.push('Lo'); if (tl <= 5) codes.push('Lt'); if (atm >= 0 && atm <= 3 && hydro >= 0 && hydro <= 3 && pop >= 6) codes.push('Na'); if (pop >= 4 && pop <= 6) codes.push('Ni'); if (atm >= 2 && atm <= 5 && hydro >= 0 && hydro <= 3) codes.push('Po'); if ([6,8].includes(atm) && pop >= 6 && pop <= 8 && gov >= 4 && gov <= 9) codes.push('Ri'); if (hydro === 10) codes.push('Wa'); return codes; }
function suggestZoneValue(starport, atm, law, pop) { if (starport === 'X' || [10,11,12].includes(atm) || law >= 10) return 'Amber'; if (pop === 0) return 'Amber'; return 'Green'; }
function populationLabel(pop) { return ({0:'None',1:'Tens',2:'Hundreds',3:'Thousands',4:'Tens of thousands',5:'Hundreds of thousands',6:'Millions',7:'Tens of millions',8:'Hundreds of millions',9:'Billions',10:'Tens of billions',11:'Hundreds of billions',12:'Trillions'})[pop] || 'Extremely high'; }
function sizeLabel(size) { return size === 0 ? 'Asteroid / negligible body' : `Approx. ${size * 1600} km diameter band`; }
function hydroLabel(hydro) { return hydro === 0 ? 'No significant open water' : hydro === 10 ? 'Almost entirely water' : `About ${hydro * 10}% surface water`; }
function lawLabel(law) { return law <= 0 ? 'No meaningful restrictions' : law <= 3 ? 'Loose law' : law <= 6 ? 'Moderate controls' : law <= 9 ? 'Restrictive' : 'Severe / intrusive controls'; }
function tlLabel(tl) { return tl <= 3 ? 'Primitive / pre-industrial' : tl <= 6 ? 'Industrial to early space age' : tl <= 8 ? 'Early interstellar support' : tl <= 10 ? 'Common interstellar' : tl <= 12 ? 'Advanced interstellar' : 'Very high technology'; }
function sanitizeFileName(text) { return String(text || 'Unnamed').replace(/[\\/:*?"<>|#^[\]]/g, '').replace(/\s+/g, ' ').trim() || 'Unnamed'; }
function deriveAllegianceCode(name) { const s = String(name || 'Independent').trim(); if (s === 'Independent') return 'In'; return s.split(/\s+/).map(w => w[0]).join('').slice(0,4) || 'Na'; }
function getBaseCodes(bases) { return Array.from(bases).map(b => BASE_CODES[b] || b[0]).filter(Boolean); }
function zoneCode(zone) { return zone === 'Amber' ? 'A' : zone === 'Red' ? 'R' : '-'; }
function parseHex(hex) { const s = String(hex || '').padStart(4, '0'); return { col: parseInt(s.slice(0,2), 10), row: parseInt(s.slice(2,4), 10) }; }
function formatHex(col,row) { return `${String(col).padStart(2,'0')}${String(row).padStart(2,'0')}`; }
function oddQToCube(col,row) { const x = col; const z = row - (col - (col & 1)) / 2; const y = -x - z; return { x, y, z }; }
function hexDistance(a,b) { const ac = oddQToCube(a.col, a.row), bc = oddQToCube(b.col, b.row); return Math.max(Math.abs(ac.x-bc.x), Math.abs(ac.y-bc.y), Math.abs(ac.z-bc.z)); }
function reachableHexes(hex, jump, cols, rows) { const here = parseHex(hex); const out = []; for (let c=1;c<=cols;c++) for (let r=1;r<=rows;r++) { const other = { col:c, row:r }; const d = hexDistance(here, other); if (d > 0 && d <= jump) out.push(formatHex(c,r)); } return out; }
function rollStellar() { const spectral = pick(['M','M','M','K','K','G','G','F','A']); const digit = Math.floor(Math.random()*10); const lum = spectral === 'A' && Math.random() < 0.2 ? 'IV' : 'V'; return `${spectral}${digit} ${lum}`; }
function rollWorldCount(belts, gasGiants) { return Math.max(1, Math.min(20, 1 + belts + gasGiants + Math.floor(Math.random() * 8))); }
function rollImportance(v, codes, starport) { let ix = 0; if (['A','B'].includes(starport)) ix += 1; if (starport === 'X') ix -= 1; if (codes.includes('Ag') || codes.includes('In') || codes.includes('Ri')) ix += 1; if (codes.includes('Hi')) ix += 1; if (v.tl >= 12) ix += 1; if (v.pop <= 3) ix -= 1; if (v.law >= 10) ix -= 1; return Math.max(-3, Math.min(5, ix)); }
function importanceBand(ix) { if (ix >= 4) return 'sector'; if (ix >= 2) return 'regional'; if (ix >= 0) return 'local'; return 'backwater'; }

class TravellerToolkitPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.systemFolder && this.settings.worldFolder) this.settings.systemFolder = this.settings.worldFolder;
    this.registerView(VIEW_TYPE_TRAVELLER_TOOLKIT, (leaf) => new TravellerToolkitView(leaf, this));
    this.addRibbonIcon('dice', 'Open Traveller Toolkit', () => this.activateView());
    this.addCommand({ id: 'open-traveller-toolkit', name: 'Open Traveller Toolkit', callback: () => this.activateView() });
    this.addSettingTab(new TravellerToolkitSettingTab(this.app, this));
  }
  onunload() { this.app.workspace.detachLeavesOfType(VIEW_TYPE_TRAVELLER_TOOLKIT); }
  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRAVELLER_TOOLKIT);
    let leaf = leaves[0];
    if (!leaf) { leaf = this.app.workspace.getRightLeaf(false); if (!leaf) { new Notice('Could not open Traveller Toolkit sidebar.'); return; } await leaf.setViewState({ type: VIEW_TYPE_TRAVELLER_TOOLKIT, active: true }); }
    this.app.workspace.revealLeaf(leaf);
  }
  async saveSettings() { await this.saveData(this.settings); }
}

class TravellerToolkitView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.state = this.defaultState(); this.controls = {}; this.baseChecks = new Map(); }
  getViewType() { return VIEW_TYPE_TRAVELLER_TOOLKIT; }
  getDisplayText() { return 'Traveller Toolkit'; }
  getIcon() { return 'dice'; }
  defaultState() {
    const style = NAME_STYLES[this.plugin?.settings?.defaultNameStyle || 'Frontier Anglo'] || NAME_STYLES['Frontier Anglo'];
    return { hex: '0609', createHex: '0609', name: 'Unnamed', nameStyle: this.plugin?.settings?.defaultNameStyle || 'Frontier Anglo', nameSeed: this.plugin?.settings?.defaultNameSeed || 'Ardress', namePattern: style.patterns.join(', '), nameSuffixes: style.suffixes, nameSuffixChance: 45, dossierStyle: 'Balanced', dossierComplexity: 'Layered', dossierDensity: 3, frontierCore: 35, dangerLevel: 25, corporateInfluence: 25, weirdnessLevel: 15, loadHex: '', allegiance: this.plugin?.settings?.defaultAllegiance || 'Independent', allegianceCode: this.plugin?.settings?.defaultAllegianceCode || deriveAllegianceCode(this.plugin?.settings?.defaultAllegiance || 'Independent'), zone: 'Green', gasGiant: true, popMultiplier: 1, belts: 0, gasGiants: 1, pbg: '101', worldCount: 1, stellar: 'G2 V', stars: ['G2 V'], importance: 0, prominence: this.plugin?.settings?.defaultProminence || 'minor', routeRole: 'backwater', refinedFuel: true, unrefinedFuel: true, wildernessRefuelling: true, fuelSources: ['gas giant'], xboatRoute: false, tradeRoute: false, patrolRoute: false, jump1Neighbors: [], jump2Neighbors: [], starportLocation: 'mainworld', downport: '', starportFacilities: 'standard', starport: 'C', size: 7, atm: 6, hydro: 7, pop: 6, gov: 4, law: 5, tl: 8, bases: new Set(), secImportText: '' };
  }
  async onOpen() { this.render(); }
  async onClose() {}
  render() {
    const root = this.containerEl.children[1]; root.empty(); root.addClass('traveller-toolkit-view');
    this.activeTool = this.activeTool || 'workbench';

    const header = root.createDiv({ cls: 'tt-header' });
    header.createEl('h2', { text: 'Traveller Toolkit', cls: 'tt-title' });
    header.createDiv({ text: 'A system-first Traveller helper. Start with Quickstart, then open Advanced Details only when you need deeper map metadata.', cls: 'tt-subtitle' });

    const nav = root.createDiv({ cls: 'tt-tool-nav' });
    const navItems = [
      ['workbench', 'Quick', 'Quickstart: roll or enter the system basics. Best place to start.'],
      ['advanced', 'Details', 'Advanced Details: Traveller Map metadata, fuel, routes, bases, and SEC import/export.'],
      ['subsector', 'Sector', 'Subsector Tools: index systems, calculate neighbors, bulk import, validate, and create route canvas.'],
      ['outputs', 'Notes', 'Outputs & Notes: copy map lines/YAML and create Obsidian notes.']
    ];
    navItems.forEach(([key, label, tip]) => {
      const b = nav.createEl('button', { text: label, cls: 'tt-nav-button' });
      b.title = tip;
      b.addEventListener('click', () => this.switchTool(key));
      this.controls[`nav_${key}`] = b;
    });

    const workbench = this.toolSection(root, 'workbench');
    const advanced = this.toolSection(root, 'advanced');
    const subsector = this.toolSection(root, 'subsector');
    const outputs = this.toolSection(root, 'outputs');

    const hexBar = this.card(workbench, 'Hex Command Bar', 'Start here: create a new hex or load an existing one without hunting through the longer form.');
    const hexGrid = hexBar.createDiv({ cls: 'tt-hex-command-grid' });
    const createBox = hexGrid.createDiv({ cls: 'tt-hex-command-box' });
    createBox.createDiv({ text: 'Create Hex', cls: 'tt-mini-heading' });
    this.inputRow(createBox, 'Hex', 'createHex');
    const createBtn = createBox.createEl('button', { text: 'Create / Roll Hex', cls: 'tt-wide-button' });
    createBtn.title = 'Sets the active hex, rolls the full system package, and prepares it for creating the system folder.';
    createBtn.addEventListener('click', () => {
      this.state.hex = String(this.state.createHex || this.state.hex || '0000').padStart(4, '0');
      this.controls.hex && (this.controls.hex.value = this.state.hex);
      this.rollFullSystem();
    });
    const loadBox = hexGrid.createDiv({ cls: 'tt-hex-command-box' });
    loadBox.createDiv({ text: 'Load Hex', cls: 'tt-mini-heading' });
    this.inputRow(loadBox, 'Hex', 'loadHex');
    const loadBtn = loadBox.createEl('button', { text: 'Load Hex', cls: 'tt-wide-button' });
    loadBtn.title = 'Loads an existing system by hex if a system note already exists in the vault.';
    loadBtn.addEventListener('click', () => this.loadSystemByHex(this.state.loadHex || this.state.hex));

    const start = this.card(workbench, 'Start Here', 'Roll the UWP, generate a name, then create the system folder. You can ignore the advanced data until the system matters.');
    const quick = start.createDiv({ cls: 'tt-quick-actions' });
    this.bigButton(quick, 'Roll Full System', 'Rolls name, UWP, Traveller map metadata, extras, and starter-dossier style using the sliders.', () => this.rollFullSystem(), true);
    this.bigButton(quick, 'Generate Name', 'Creates a name using the sliders plus the configurable naming options below.', () => this.generateWorldName());
    this.bigButton(quick, 'Create System Folder', 'Creates Systems/HEX - Name/_Name.md with strong YAML metadata.', () => this.createSystemFolder());
    this.bigButton(quick, 'Copy Map Link', 'Copies the map line wrapped as an Obsidian link to the system note.', () => this.copyText(this.getLinkedMapLine()));
    this.bigButton(quick, 'Load Active System', 'Loads metadata from the active system, mainworld, or support note into this panel.', () => this.loadActiveSystemNote());
    this.bigButton(quick, 'Promote Loaded System', 'Safely adds mainworld/support notes and marks the system playable without overwriting existing notes.', () => this.promoteSystem());
    this.bigButton(quick, 'Regenerate Dossier', 'Replaces the generated dossier sections in the mainworld note with cleaner Dossier Engine v4 prose.', () => this.regenerateMainworldDossier());

    const bias = this.card(workbench, 'Generation Direction', 'Use these sliders before rolling to steer random generation without manually setting every UWP field. 0 means remote/low/quiet; 100 means core/high/intense.');
    this.rangeRow(bias, 'Frontier ↔ Core', 'frontierCore', 0, 100);
    this.rangeRow(bias, 'Danger / Restriction', 'dangerLevel', 0, 100);
    this.rangeRow(bias, 'Corporate Pressure', 'corporateInfluence', 0, 100);
    this.rangeRow(bias, 'Weird / Ancient', 'weirdnessLevel', 0, 100);

    const loadCard = this.card(workbench, 'Load Existing System', 'Load an existing system note so you can promote it later or add mainworld/support notes without recreating the folder.');
    this.inputRow(loadCard, 'Load Hex', 'loadHex');
    const loadBtns = loadCard.createDiv({ cls: 'tt-button-row' });
    loadBtns.createEl('button', { text: 'Load by Hex' }).addEventListener('click', () => this.loadSystemByHex(this.state.loadHex || this.state.hex));
    loadBtns.createEl('button', { text: 'Load Active Note' }).addEventListener('click', () => this.loadActiveSystemNote());
    this.controls.vaultStatus = loadCard.createDiv({ cls: 'tt-status-box' });

    const identity = this.card(workbench, 'System Identity', 'These fields identify the hex/system and create the folder/note names.');
    this.inputRow(identity, 'Hex', 'hex');
    this.inputRow(identity, 'Mainworld Name', 'name');
    this.selectRow(identity, 'Allegiance', 'allegiance', this.getAllegiances());
    this.inputRow(identity, 'Allegiance Code', 'allegianceCode');
    this.selectRow(identity, 'Travel Zone', 'zone', TRAVEL_ZONES);
    this.checkRow(identity, 'Gas giant present', 'gasGiant');
    this.inputRow(identity, 'Prominence', 'prominence');

    const nameDetails = identity.createEl('details', { cls: 'tt-details' });
    nameDetails.createEl('summary', { text: 'Name Generator Options' });
    nameDetails.createDiv({ text: 'Generate Name now reads the Generation Direction sliders first, then applies these options. You can always type over the result manually.', cls: 'tt-help' });
    this.selectRow(nameDetails, 'Style', 'nameStyle', Object.keys(NAME_STYLES));
    this.inputRow(nameDetails, 'Seed Text', 'nameSeed');
    this.inputRow(nameDetails, 'Pattern(s)', 'namePattern');
    this.inputRow(nameDetails, 'Suffixes', 'nameSuffixes');
    this.numberRow(nameDetails, 'Suffix Chance', 'nameSuffixChance', 0, 100);
    const nameBtns = nameDetails.createDiv({ cls: 'tt-button-row' });
    nameBtns.createEl('button', { text: 'Generate Name' }).addEventListener('click', () => this.generateWorldName());
    nameBtns.createEl('button', { text: 'Randomize Style' }).addEventListener('click', () => this.randomizeNameSettings());
    nameDetails.createDiv({ text: 'Pattern key: C = consonant, V = vowel, D = style chunk, S = seed-derived syllable. Example: S-CVC or CVDCV.', cls: 'tt-note' });

    const dossierControls = identity.createEl('details', { cls: 'tt-details' });
    dossierControls.createEl('summary', { text: 'Starter Dossier Options' });
    dossierControls.createDiv({ text: 'Controls the modular starter prose created in the mainworld note. This is still lightweight referee text, not a full dossier.', cls: 'tt-help' });
    this.selectRow(dossierControls, 'Dossier Style', 'dossierStyle', ['Balanced','Frontier Grit','Corporate Pressure','Autocracy Formal','Mystery / Weird','Trade Hub']);
    this.selectRow(dossierControls, 'Dossier Complexity', 'dossierComplexity', ['Simple','Layered','Tangled']);
    this.numberRow(dossierControls, 'Detail Density', 'dossierDensity', 1, 5);

    const fields = this.card(workbench, 'Mainworld UWP', 'The Universal World Profile describes the named mainworld inside this system.');
    this.selectRow(fields, 'Starport', 'starport', Object.keys(STARPORTS));
    this.numberRow(fields, 'Size', 'size');
    this.numberRow(fields, 'Atmosphere', 'atm');
    this.numberRow(fields, 'Hydrographics', 'hydro');
    this.numberRow(fields, 'Population', 'pop');
    this.numberRow(fields, 'Government', 'gov');
    this.numberRow(fields, 'Law', 'law');
    this.numberRow(fields, 'Tech Level', 'tl');
    const fieldBtns = fields.createDiv({ cls: 'tt-button-row' });
    fieldBtns.createEl('button', { text: 'Suggest Zone' }).addEventListener('click', () => this.suggestZone());
    fieldBtns.createEl('button', { text: 'Randomize Extras' }).addEventListener('click', () => this.randomizeMapExtras(true));

    const snapshot = this.card(workbench, 'Current Snapshot', 'A quick readout so you do not need to scroll to Outputs.');
    this.controls.uwpDisplay = snapshot.createDiv({ cls: 'tt-uwp-display' });
    this.controls.breakdown = snapshot.createDiv({ cls: 'tt-breakdown' });

    const map = this.card(advanced, 'Traveller Map Metadata', 'Optional but useful for compatibility and strong Bases filtering: PBG, stellar data, world count, importance, and route role.');
    this.numberRow(map, 'Pop Multiplier', 'popMultiplier', 0, 9);
    this.numberRow(map, 'Belts', 'belts', 0, 9);
    this.numberRow(map, 'Gas Giants', 'gasGiants', 0, 9);
    this.inputRow(map, 'PBG', 'pbg');
    this.numberRow(map, 'World Count', 'worldCount', 1, 20);
    this.inputRow(map, 'Stellar', 'stellar');
    this.numberRow(map, 'Importance', 'importance', -3, 5);
    this.inputRow(map, 'Route Role', 'routeRole');
    const mapBtns = map.createDiv({ cls: 'tt-button-row' });
    mapBtns.createEl('button', { text: 'Randomize PBG/Stellar' }).addEventListener('click', () => this.randomizeTravellerMapData());

    const fuel = this.card(advanced, 'Fuel, Port & Routes', 'These are the details that matter most when players ask, “Can we refuel or repair here?”');
    this.checkRow(fuel, 'Refined fuel', 'refinedFuel');
    this.checkRow(fuel, 'Unrefined fuel', 'unrefinedFuel');
    this.checkRow(fuel, 'Wilderness refuelling', 'wildernessRefuelling');
    this.inputRow(fuel, 'Fuel Sources', 'fuelSourcesText');
    this.inputRow(fuel, 'Starport Location', 'starportLocation');
    this.inputRow(fuel, 'Downport', 'downport');
    this.inputRow(fuel, 'Facilities', 'starportFacilities');
    this.checkRow(fuel, 'Xboat route', 'xboatRoute');
    this.checkRow(fuel, 'Trade route', 'tradeRoute');
    this.checkRow(fuel, 'Patrol route', 'patrolRoute');
    const routeBtns = fuel.createDiv({ cls: 'tt-button-row' });
    routeBtns.createEl('button', { text: 'Calculate J-1/J-2 Hexes' }).addEventListener('click', () => this.calculateNeighbors());

    const bases = this.card(advanced, 'Bases & Special Features', 'Readable base names are stored with compact base codes for export and filtering.');
    const baseGrid = bases.createDiv({ cls: 'tt-bases' });
    this.baseChecks.clear();
    BASE_OPTIONS.forEach(base => {
      const wrap = baseGrid.createDiv({ cls: 'tt-base-option' });
      const cb = wrap.createEl('input', { type: 'checkbox' });
      cb.addEventListener('change', () => { if (cb.checked) this.state.bases.add(base); else this.state.bases.delete(base); this.updateOutputs(); });
      this.baseChecks.set(base, cb);
      wrap.createEl('span', { text: `${base} (${BASE_CODES[base] || base[0]})` });
    });
    const baseBtns = bases.createDiv({ cls: 'tt-button-row' });
    baseBtns.createEl('button', { text: 'Clear Bases' }).addEventListener('click', () => this.clearBases(true));

    const sec = this.card(advanced, 'Traveller Map .SEC-ish Import / Export', 'Use this only when moving data to/from Traveller Map style records.');
    this.outputBlock(sec, 'SEC Line', 'secLine');
    const secRow = sec.createDiv({ cls: 'tt-button-row' });
    secRow.createEl('button', { text: 'Copy SEC Line' }).addEventListener('click', () => this.copyText(this.getSecLine()));
    secRow.createEl('button', { text: 'Import SEC Text' }).addEventListener('click', () => this.importSecLine(this.controls.secImport.value));
    this.outputBlock(sec, 'Paste SEC Line to Import', 'secImport');

    const subIntro = this.card(subsector, 'Subsector Tools', 'These tools read existing system notes. They are best used after you have created several systems.');
    const subBtns = subIntro.createDiv({ cls: 'tt-tool-grid' });
    this.bigButton(subBtns, 'Refresh Index', 'Builds a sortable markdown index in the output box.', () => this.showSubsectorIndex());
    this.bigButton(subBtns, 'Create Index Note', 'Creates or updates Systems/_Subsector Index.md.', () => this.createSubsectorIndexNote());
    this.bigButton(subBtns, 'Write Neighbor Backlinks', 'Calculates existing systems within Jump-1/2/3 and writes frontmatter links.', () => this.writeNeighborBacklinksForAll());
    this.bigButton(subBtns, 'Create Route Canvas', 'Creates a simple Obsidian canvas from system hex positions and route flags.', () => this.createRouteCanvas());
    this.bigButton(subBtns, 'Create Dossier Prompt', 'Creates a GenAI prompt note based on this system’s metadata.', () => this.createDossierPromptNote());
    this.bigButton(subBtns, 'Validate / Lint', 'Finds duplicate hexes, malformed UWPs, missing PBG, bad zones, and metadata gaps.', () => this.validateSystems());
    const bulk = this.card(subsector, 'Bulk .SEC Import', 'Paste several SEC-ish lines here to create multiple system folders at once. Existing systems are skipped.');
    this.outputBlock(bulk, 'Bulk .SEC Import', 'bulkSecImport');
    const bulkBtns = bulk.createDiv({ cls: 'tt-button-row' });
    bulkBtns.createEl('button', { text: 'Import Bulk SEC' }).addEventListener('click', () => this.importBulkSec(this.controls.bulkSecImport.value));
    this.outputBlock(subsector, 'Subsector / Validation Output', 'subsectorOutput');

    const out = this.card(outputs, 'Copy & Create', 'Use these when you are ready to put the data into Obsidian notes or another map/index.');
    this.outputBlock(out, 'Map Line', 'mapLine');
    const copyRow = out.createDiv({ cls: 'tt-button-row' });
    copyRow.createEl('button', { text: 'Copy UWP' }).addEventListener('click', () => this.copyText(this.getUwp()));
    copyRow.createEl('button', { text: 'Copy Map Line Link' }).addEventListener('click', () => this.copyText(this.getLinkedMapLine()));
    copyRow.createEl('button', { text: 'Copy System YAML' }).addEventListener('click', () => this.copyText(this.getYaml()));
    copyRow.createEl('button', { text: 'Copy Mainworld YAML' }).addEventListener('click', () => this.copyText(this.getMainworldYaml()));
    const noteRow = out.createDiv({ cls: 'tt-button-row' });
    noteRow.createEl('button', { text: 'Create System Folder' }).addEventListener('click', () => this.createSystemFolder());
    noteRow.createEl('button', { text: 'Create Mainworld Note' }).addEventListener('click', () => this.createMainworldNote());
    noteRow.createEl('button', { text: 'Regenerate Mainworld Dossier' }).addEventListener('click', () => this.regenerateMainworldDossier());
    noteRow.createEl('button', { text: 'Promote System' }).addEventListener('click', () => this.promoteSystem());
    noteRow.createEl('button', { text: 'Load Active Note' }).addEventListener('click', () => this.loadActiveSystemNote());
    noteRow.createEl('button', { text: 'Insert System YAML in Active Note' }).addEventListener('click', () => this.insertYamlIntoActiveNote());

    const yamlDetails = outputs.createEl('details', { cls: 'tt-details' });
    yamlDetails.createEl('summary', { text: 'System YAML Preview' });
    this.outputBlock(yamlDetails, 'System YAML', 'yaml');

    this.syncControls();
    this.updateOutputs();
    this.switchTool(this.activeTool);
  }

  toolSection(parent, key) { const section = parent.createDiv({ cls: 'tt-tool-section' }); section.dataset.tool = key; return section; }
  switchTool(key) { this.activeTool = key; const root = this.containerEl.children[1]; root.querySelectorAll('.tt-tool-section').forEach(sec => { sec.style.display = sec.dataset.tool === key ? '' : 'none'; }); root.querySelectorAll('.tt-nav-button').forEach(btn => btn.removeClass('is-active')); const active = this.controls[`nav_${key}`]; if (active) active.addClass('is-active'); }
  card(parent, title, desc = '') { const c = parent.createDiv({ cls: 'tt-card' }); c.createEl('h3', { text: title }); if (desc) c.createDiv({ text: desc, cls: 'tt-help' }); return c; }
  bigButton(parent, label, desc, onClick, primary = false) { const btn = parent.createEl('button', { cls: primary ? 'tt-big-button is-primary' : 'tt-big-button' }); btn.createSpan({ text: label, cls: 'tt-big-button-title' }); btn.createSpan({ text: desc, cls: 'tt-big-button-desc' }); btn.title = desc; btn.addEventListener('click', onClick); return btn; }
  inputRow(parent, label, key) { const row = parent.createDiv({ cls: 'tt-row' }); const lbl = row.createEl('label', { text: label }); if (helpFor(label)) { lbl.title = helpFor(label); row.title = helpFor(label); } const input = row.createEl('input', { type: 'text' }); input.addEventListener('input', () => { if (key === 'fuelSourcesText') this.state.fuelSources = cleanList(input.value); else this.state[key] = input.value; if (key === 'allegiance' && !this.state.allegianceCode) this.state.allegianceCode = deriveAllegianceCode(input.value); this.updateOutputs(); }); this.controls[key] = input; return input; }
  numberRow(parent, label, key, min = 0, max = 15) { const row = parent.createDiv({ cls: 'tt-row' }); const lbl = row.createEl('label', { text: label }); if (helpFor(label)) { lbl.title = helpFor(label); row.title = helpFor(label); } const input = row.createEl('input', { type: 'number' }); input.min = String(min); input.max = String(max); input.addEventListener('input', () => { this.state[key] = clamp(input.value, min, max); if (['popMultiplier','belts','gasGiants'].includes(key)) this.updatePbgFromFields(); this.updateOutputs(); }); this.controls[key] = input; return input; }
  rangeRow(parent, label, key, min = 0, max = 100) { const row = parent.createDiv({ cls: 'tt-row tt-range-row' }); const lbl = row.createEl('label', { text: label }); const wrap = row.createDiv({ cls: 'tt-range-wrap' }); const input = wrap.createEl('input', { type: 'range' }); input.min = String(min); input.max = String(max); input.step = '1'; const value = wrap.createEl('span', { cls: 'tt-range-value' }); input.addEventListener('input', () => { this.state[key] = clamp(input.value, min, max); value.setText(String(this.state[key])); this.updateOutputs(); }); this.controls[key] = input; this.controls[key + '_value'] = value; return input; }
  selectRow(parent, label, key, options) { const row = parent.createDiv({ cls: 'tt-row' }); const lbl = row.createEl('label', { text: label }); if (helpFor(label)) { lbl.title = helpFor(label); row.title = helpFor(label); } const sel = row.createEl('select'); options.forEach(o => sel.createEl('option', { text: o, value: o })); sel.addEventListener('change', () => { this.state[key] = sel.value; if (key === 'nameStyle') this.applyNameStyleDefaults(); if (key === 'allegiance') this.state.allegianceCode = deriveAllegianceCode(sel.value); this.updateOutputs(); }); this.controls[key] = sel; return sel; }
  checkRow(parent, label, key) { const row = parent.createDiv({ cls: 'tt-check' }); const cb = row.createEl('input', { type: 'checkbox' }); row.createEl('label', { text: label }); cb.addEventListener('change', () => { this.state[key] = cb.checked; if (key === 'gasGiant' && !cb.checked) { this.state.gasGiants = 0; this.updatePbgFromFields(); } this.updateOutputs(); }); this.controls[key] = cb; return cb; }
  outputBlock(parent, label, key) { parent.createEl('label', { text: label }); const area = parent.createEl('textarea'); area.readOnly = !['secImport','bulkSecImport'].includes(key); area.addEventListener('input', () => { if (key === 'secImport') this.state.secImportText = area.value; if (key === 'bulkSecImport') this.state.bulkSecImportText = area.value; }); this.controls[key] = area; return area; }
  getAllegiances() { const list = String(this.plugin.settings.allegianceList || '').split('\n').map(x => x.trim()).filter(Boolean); return list.length ? list : DEFAULT_ALLEGIANCES; }
  syncControls() { Object.entries(this.controls).forEach(([k, el]) => { if (k === 'uwpDisplay' || k === 'breakdown' || k === 'mapLine' || k === 'yaml' || k === 'secLine' || k === 'secImport' || k === 'vaultStatus' || k.endsWith('_value')) return; if (k === 'fuelSourcesText') el.value = (this.state.fuelSources || []).join(', '); else if (el.type === 'checkbox') el.checked = !!this.state[k]; else el.value = this.state[k] ?? ''; const val = this.controls[k + '_value']; if (val) val.setText(String(this.state[k] ?? '')); }); BASE_OPTIONS.forEach(b => { const cb = this.baseChecks.get(b); if (cb) cb.checked = this.state.bases.has(b); }); }
  values() { return { starport: this.state.starport, size: clamp(this.state.size), atm: clamp(this.state.atm), hydro: clamp(this.state.hydro), pop: clamp(this.state.pop), gov: clamp(this.state.gov), law: clamp(this.state.law), tl: clamp(this.state.tl) }; }
  getUwp() { const v = this.values(); return `${v.starport}${hx(v.size)}${hx(v.atm)}${hx(v.hydro)}${hx(v.pop)}${hx(v.gov)}${hx(v.law)}-${hx(v.tl)}`; }
  getTradeCodes() { const v = this.values(); return deriveTradeCodes(v.size, v.atm, v.hydro, v.pop, v.gov, v.law, v.tl); }
  systemName() { return `${this.state.name || 'Unnamed'} System`; }
  folderFromPath(path) { const parts = normalizePath(String(path || '')).split('/'); parts.pop(); return parts.join('/'); }
  fileExists(path) { return !!this.plugin.app.vault.getAbstractFileByPath(normalizePath(path)); }
  pathLooksLikeMarkdownFile(file) { return !!file && typeof file.path === 'string' && file.path.toLowerCase().endsWith('.md'); }
  parseSystemFolderPath(path) { const folder = this.folderFromPath(path); const leaf = folder.split('/').pop() || ''; const m = leaf.match(/^(\d{4})\s*-\s*(.+)$/); if (!m) return null; return { folder, hex: m[1], name: m[2] }; }
  shouldUseLoadedSystemFolder() { return !!(this.state.loadedSystemFolder && this.state.loadedSystemHex && this.state.loadedSystemHex === this.state.hex && this.fileExists(this.state.loadedSystemFilePath || '')); }
  systemFolderPath() { if (this.shouldUseLoadedSystemFolder()) return normalizePath(this.state.loadedSystemFolder); return normalizePath(`${this.plugin.settings.systemFolder || 'Systems'}/${this.state.hex || '0000'} - ${sanitizeFileName(this.state.name)}`); }
  systemIndexFileName() { const raw = String(this.plugin.settings.systemIndexFile || '_{name}.md'); const name = sanitizeFileName(this.state.name || 'Unnamed'); if (raw === '_System.md' || raw === '_{name}.md' || raw.trim() === '') return `_${name}.md`; return raw.replace(/\{name\}/g, name).replace(/\{hex\}/g, this.state.hex || '0000'); }
  systemIndexPath() { if (this.shouldUseLoadedSystemFolder()) return normalizePath(this.state.loadedSystemFilePath); return normalizePath(`${this.systemFolderPath()}/${this.systemIndexFileName()}`); }
  mainworldNotePathNoExt() { return normalizePath(`${this.systemFolderPath()}/${sanitizeFileName(this.state.name)}`); }
  systemIndexLinkTarget() { return this.systemIndexPath().replace(/\.md$/i, ''); }
  getLinkedMapLine() { return `[[${this.systemIndexLinkTarget()}|${this.getMapLine()}]]`; }
  getMapLine() { const bases = Array.from(this.state.bases); const codes = this.getTradeCodes(); const gg = this.state.gasGiants > 0 || this.state.gasGiant ? 'G' : '-'; return `${this.state.hex || '0000'}  ${this.state.name || 'Unnamed'}  ${this.getUwp()}  ${bases.length ? bases.join('/') : '-'}  ${codes.length ? codes.join(' ') : '-'}  ${gg}  ${this.state.allegianceCode || deriveAllegianceCode(this.state.allegiance)}  ${this.state.zone}`; }
  updatePbgFromFields() { this.state.pbg = `${clamp(this.state.popMultiplier,0,9)}${clamp(this.state.belts,0,9)}${clamp(this.state.gasGiants,0,9)}`; this.state.gasGiant = clamp(this.state.gasGiants,0,9) > 0; }
  updateFuelFromSystem() { const v = this.values(); this.state.refinedFuel = ['A','B','C'].includes(v.starport); this.state.unrefinedFuel = this.state.gasGiants > 0 || v.hydro > 0 || this.state.belts > 0; this.state.wildernessRefuelling = this.state.gasGiants > 0 || v.hydro > 0 || this.state.belts > 0; const sources = []; if (this.state.gasGiants > 0) sources.push('gas giant'); if (v.hydro > 0) sources.push('mainworld water'); if (this.state.belts > 0) sources.push('ice/asteroid belt'); if (this.state.refinedFuel) sources.push('refined starport fuel'); this.state.fuelSources = sources; }
  sharedYamlLines(recordType, type) { const v = this.values(); const codes = this.getTradeCodes(); const bases = Array.from(this.state.bases); const baseCodes = getBaseCodes(bases); const fuel = this.state.fuelSources || []; const stars = this.state.stars && this.state.stars.length ? this.state.stars : [this.state.stellar]; return [
    `type: ${type}`, `record_type: ${recordType}`, `hex: "${yamlString(this.state.hex || '0000')}"`, `system_hex: "${yamlString(this.state.hex || '0000')}"`, `system: "${yamlString(this.systemName())}"`, `system_name: "${yamlString(this.systemName())}"`, `system_folder: "${yamlString(this.systemFolderPath())}"`, `system_note: "[[${yamlString(this.systemIndexLinkTarget())}|${yamlString(this.systemName())}]]"`, `mainworld: "${yamlString(this.state.name || 'Unnamed')}"`, `mainworld_note: "[[${yamlString(this.mainworldNotePathNoExt())}|${yamlString(this.state.name || 'Unnamed')}]]"`, `mainworld_uwp: "${this.getUwp()}"`, `uwp: "${this.getUwp()}"`, `map_line: "${yamlString(this.getMapLine())}"`, `sec_line: "${yamlString(this.getSecLine())}"`, `starport: "${v.starport}"`, `size: ${v.size}`, `atmosphere: ${v.atm}`, `hydrographics: ${v.hydro}`, `population: ${v.pop}`, `population_multiplier: ${clamp(this.state.popMultiplier,0,9)}`, `government: ${v.gov}`, `law: ${v.law}`, `tech_level: ${v.tl}`, `trade_codes: ${safeJsonArray(codes)}`, `bases: ${safeJsonArray(bases)}`, `base_codes: ${safeJsonArray(baseCodes)}`, `belts: ${clamp(this.state.belts,0,9)}`, `gas_giants: ${clamp(this.state.gasGiants,0,9)}`, `gas_giant: ${this.state.gasGiants > 0 || !!this.state.gasGiant}`, `pbg: "${yamlString(this.state.pbg)}"`, `world_count: ${clamp(this.state.worldCount,1,99)}`, `stars: ${safeJsonArray(stars)}`, `primary_star: "${yamlString(stars[0] || '')}"`, `stellar: "${yamlString(this.state.stellar || '')}"`, `importance: ${clamp(this.state.importance,-9,9)}`, `importance_extension: "{ ${clamp(this.state.importance,-9,9)} }"`, `importance_band: "${importanceBand(clamp(this.state.importance,-9,9))}"`, `route_role: "${yamlString(this.state.routeRole)}"`, `xboat_route: ${!!this.state.xboatRoute}`, `trade_route: ${!!this.state.tradeRoute}`, `patrol_route: ${!!this.state.patrolRoute}`, `jump_1_neighbors: ${safeJsonArray(this.state.jump1Neighbors || [])}`, `jump_2_neighbors: ${safeJsonArray(this.state.jump2Neighbors || [])}`, `refined_fuel_available: ${!!this.state.refinedFuel}`, `unrefined_fuel_available: ${!!this.state.unrefinedFuel}`, `wilderness_refuelling: ${!!this.state.wildernessRefuelling}`, `fuel_sources: ${safeJsonArray(fuel)}`, `starport_location: "${yamlString(this.state.starportLocation)}"`, `mainworld_downport: "${yamlString(this.state.downport)}"`, `starport_facilities: "${yamlString(this.state.starportFacilities)}"`, `travel_zone: "${yamlString(this.state.zone)}"`, `allegiance: "${yamlString(this.state.allegiance)}"`, `allegiance_code: "${yamlString(this.state.allegianceCode || deriveAllegianceCode(this.state.allegiance))}"`, `prep_status: "${yamlString(this.plugin.settings.defaultStatus || 'stub')}"`, `status: "${yamlString(this.plugin.settings.defaultStatus || 'stub')}"`, `prominence: "${yamlString(this.state.prominence || this.plugin.settings.defaultProminence || 'minor')}"`, `canon_status: "homebrew"`, `visibility: "referee"`, `secret_level: "referee"` ]; }
  getSystemYaml() { return `---\n${this.sharedYamlLines('system','system').join('\n')}\ntags: ["traveller", "traveller/system", "system"]\n---`; }
  getMainworldYaml() { return `---
${this.sharedYamlLines('mainworld','world').concat(this.dossierYamlLines()).concat([`role: "mainworld"`, `is_mainworld: true`, `tags: ["traveller", "traveller/world", "traveller/mainworld", "world", "mainworld"]`]).join('\n')}
---`; }
  getSupportYaml(supportType, title) { return `---\n${this.sharedYamlLines('system_support','system_support').concat([`support_type: "${yamlString(supportType)}"`, `role: "${yamlString(supportType)}"`, `title: "${yamlString(title)}"`, `tags: ["traveller", "traveller/support", "traveller/${yamlString(supportType)}", "${yamlString(supportType)}"]`]).join('\n')}\n---`; }
  getYaml() { return this.getSystemYaml(); }
  getBreakdown() { const v = this.values(); const codes = this.getTradeCodes(); const bases = Array.from(this.state.bases); return [`System: ${this.systemName()}`, `Mainworld UWP: ${this.getUwp()}`, `PBG: ${this.state.pbg}   Worlds: ${this.state.worldCount}   Stellar: ${this.state.stellar}`, `Importance: { ${this.state.importance} } (${importanceBand(this.state.importance)})`, '', `Starport ${v.starport}: ${STARPORTS[v.starport] || 'Unknown'}`, `Size ${hx(v.size)}: ${sizeLabel(v.size)}`, `Atmosphere ${hx(v.atm)}: ${ATMOSPHERES[v.atm] || 'Unknown'}`, `Hydrographics ${hx(v.hydro)}: ${hydroLabel(v.hydro)}`, `Population ${hx(v.pop)} x${this.state.popMultiplier}: ${populationLabel(v.pop)}`, `Government ${hx(v.gov)}: ${GOVERNMENTS[v.gov] || 'Unknown'}`, `Law ${hx(v.law)}: ${lawLabel(v.law)}`, `Tech Level ${hx(v.tl)}: ${tlLabel(v.tl)}`, '', `Trade Codes: ${codes.length ? codes.join(', ') : 'None'}`, `Bases: ${bases.length ? bases.join(', ') : 'None'} (${getBaseCodes(bases).join('') || '-'})`, `Fuel: ${this.state.fuelSources.join(', ') || 'none recorded'}`, `Routes: ${this.state.xboatRoute ? 'Xboat ' : ''}${this.state.tradeRoute ? 'Trade ' : ''}${this.state.patrolRoute ? 'Patrol' : ''}`.trim() || 'Routes: none', `J-1 hexes: ${(this.state.jump1Neighbors || []).join(', ') || 'not calculated'}`, '', 'Map-line order:', 'Hex | Mainworld | UWP | Bases | Trade Codes | Gas Giant | Allegiance Code | Zone'].join('\n'); }
  updateOutputs() { this.syncControls(); this.controls.uwpDisplay.setText(this.getUwp()); this.controls.mapLine.value = this.getMapLine(); this.controls.yaml.value = this.getYaml(); this.controls.breakdown.setText(this.getBreakdown()); this.controls.secLine.value = this.getSecLine(); this.updateVaultStatus(); }
  applyNameStyleDefaults() { const style = NAME_STYLES[this.state.nameStyle] || NAME_STYLES['Frontier Anglo']; this.state.namePattern = style.patterns.join(', '); this.state.nameSuffixes = style.suffixes; }
  applyNameBiasesFromSliders() {
    const core = clamp(this.state.frontierCore, 0, 100);
    const danger = clamp(this.state.dangerLevel, 0, 100);
    const corp = clamp(this.state.corporateInfluence, 0, 100);
    const weird = clamp(this.state.weirdnessLevel, 0, 100);
    let styleName = 'Frontier Anglo';
    if (weird >= 68) styleName = 'Ancient / Ruinous';
    else if (corp >= 65) styleName = 'Corporate Polished';
    else if (this.state.allegiance === 'Autocracy' || danger >= 78) styleName = 'Autocracy Formal';
    else if (core <= 30) styleName = 'Sparse Rim';
    else if (core >= 72) styleName = corp >= 45 ? 'Corporate Polished' : 'Frontier Anglo';
    const priorStyle = this.state.nameStyle;
    this.state.nameStyle = styleName;
    const style = NAME_STYLES[styleName] || NAME_STYLES['Frontier Anglo'];
    if (priorStyle !== styleName || !this.state.namePattern || !this.state.nameSuffixes) this.applyNameStyleDefaults();
    const suffixBase = core >= 70 ? 55 : core <= 30 ? 35 : 45;
    const corpBoost = corp >= 65 ? 15 : 0;
    const weirdDrop = weird >= 75 ? -10 : 0;
    this.state.nameSuffixChance = clamp(suffixBase + corpBoost + weirdDrop, 15, 85);
    if (corp >= 65 && this.state.dossierStyle === 'Balanced') this.state.dossierStyle = 'Corporate Pressure';
    else if (weird >= 68) this.state.dossierStyle = 'Mystery / Weird';
    else if (danger >= 70 || this.state.allegiance === 'Autocracy') this.state.dossierStyle = 'Autocracy Formal';
    else if (core <= 30 && this.state.dossierStyle === 'Balanced') this.state.dossierStyle = 'Frontier Grit';
    else if (core >= 75 && this.state.dossierStyle === 'Balanced') this.state.dossierStyle = 'Trade Hub';
    if (core >= 75 || danger >= 70 || weird >= 70 || corp >= 70) this.state.dossierComplexity = 'Tangled';
    else if (core <= 25 && danger <= 35 && corp <= 35) this.state.dossierComplexity = 'Simple';
    else this.state.dossierComplexity = 'Layered';
    this.state.dossierDensity = clamp(2 + Math.round((core + danger + corp + weird) / 120), 1, 5);
    return style;
  }
  generateWorldName(showNotice = true) { const style = this.applyNameBiasesFromSliders(); const rand = seededRandom(`${this.state.nameSeed}|${this.state.hex}|${this.state.nameStyle}|${this.state.frontierCore}|${this.state.dangerLevel}|${this.state.corporateInfluence}|${this.state.weirdnessLevel}|${Date.now()}|${Math.random()}`); const patterns = cleanList(this.state.namePattern || style.patterns.join(',')); const pattern = pick(patterns.length ? patterns : style.patterns, rand); let name = buildNameFromPattern(pattern, style, this.state.nameSeed, rand); const suffixes = cleanList(this.state.nameSuffixes || style.suffixes); if (suffixes.length && rand() < clamp(this.state.nameSuffixChance, 0, 100) / 100) { const suffix = pick(suffixes, rand); name = rand() < 0.35 ? `${name} ${suffix}` : `${name}${suffix.toLowerCase()}`; } this.state.name = titleCaseName(name); this.updateOutputs(); if (showNotice) new Notice(`Traveller name generated (${this.state.nameStyle}).`); }
  randomizeNameSettings() { this.applyNameBiasesFromSliders(); const likely = [this.state.nameStyle, this.state.nameStyle, 'Frontier Anglo', 'Corporate Polished', 'Sparse Rim', 'Ancient / Ruinous', 'Autocracy Formal']; this.state.nameStyle = pick(likely); this.applyNameStyleDefaults(); this.state.nameSuffixChance = Math.floor(25 + Math.random() * 55); this.generateWorldName(); }
  applyGenerationBiases() { const core = clamp(this.state.frontierCore,0,100); const danger = clamp(this.state.dangerLevel,0,100); const corp = clamp(this.state.corporateInfluence,0,100); const weird = clamp(this.state.weirdnessLevel,0,100); const improve = () => { const ports = ['C','B','A']; this.state.starport = pick(ports); this.state.pop = clamp(this.state.pop + Math.floor(core/30)); this.state.tl = clamp(this.state.tl + Math.floor(core/35)); this.state.importance = clamp((this.state.importance || 0) + 1, -3, 5); }; const roughen = () => { const ports = ['D','E','X','C']; this.state.starport = pick(ports); this.state.pop = clamp(this.state.pop - Math.floor((35-core)/15)); this.state.tl = clamp(this.state.tl - Math.floor((35-core)/20)); this.state.routeRole = 'backwater'; }; if (core >= 70) { improve(); this.state.tradeRoute = Math.random() < 0.55; this.state.xboatRoute = Math.random() < 0.25; this.state.routeRole = core > 85 ? 'core hub' : 'regional route'; this.state.refinedFuel = true; } else if (core <= 35) { roughen(); this.state.patrolRoute = this.state.patrolRoute || Math.random() < 0.20; } if (danger >= 60) { this.state.law = clamp(this.state.law + Math.floor((danger-45)/15)); if (Math.random() < (danger-50)/80) this.state.zone = danger > 88 ? 'Red' : 'Amber'; if (Math.random() < danger/140) this.state.bases.add('Pirate'); } if (corp >= 60) { if (!['Autocracy','Independent'].includes(this.state.allegiance) || Math.random() < 0.45) { this.state.allegiance = corp > 80 ? 'Corporate Client' : this.state.allegiance; this.state.allegianceCode = deriveAllegianceCode(this.state.allegiance); } if (['A','B','C'].includes(this.state.starport) || corp > 75) this.state.bases.add('Corporate'); this.state.starportFacilities = corp > 70 ? 'contract services, bonded brokers, corporate security, scheduled maintenance' : this.state.starportFacilities; } if (weird >= 55) { if (Math.random() < weird/100) this.state.bases.add('Ancient Site'); if (Math.random() < (weird-40)/100 && this.state.zone === 'Green') this.state.zone = 'Amber'; if (weird > 75) this.state.dossierStyle = 'Mystery / Weird'; } this.updatePbgFromFields(); this.updateFuelFromSystem(); }
  rollUwp() { let size = clamp(roll2d() - 2); let atm = clamp(roll2d() - 7 + size); let hydro = clamp(roll2d() - 7 + size); if (size <= 1) hydro = 0; let pop = clamp(roll2d() - 2); let gov = pop === 0 ? 0 : clamp(roll2d() - 7 + pop); let law = pop === 0 ? 0 : clamp(roll2d() - 7 + gov); let starport = rollStarport(pop); let tl = d6() + ({ A: 6, B: 4, C: 2, D: 0, E: -1, X: -4 }[starport] || 0); if (size <= 1) tl += 1; if ([0,1,2,3,10,11,12].includes(atm)) tl += 1; if ([0,10].includes(hydro)) tl += 1; if (pop >= 9) tl += 1; Object.assign(this.state, { starport, size, atm, hydro, pop, gov, law, tl: clamp(tl) }); this.randomizeMapExtras(false); this.updateOutputs(); new Notice('UWP rolled.'); }
  rollFullSystem() { let size = clamp(roll2d() - 2); let atm = clamp(roll2d() - 7 + size); let hydro = clamp(roll2d() - 7 + size); if (size <= 1) hydro = 0; let pop = clamp(roll2d() - 2); let gov = pop === 0 ? 0 : clamp(roll2d() - 7 + pop); let law = pop === 0 ? 0 : clamp(roll2d() - 7 + gov); let starport = rollStarport(pop); let tl = d6() + ({ A: 6, B: 4, C: 2, D: 0, E: -1, X: -4 }[starport] || 0); if (size <= 1) tl += 1; if ([0,1,2,3,10,11,12].includes(atm)) tl += 1; if ([0,10].includes(hydro)) tl += 1; if (pop >= 9) tl += 1; Object.assign(this.state, { starport, size, atm, hydro, pop, gov, law, tl: clamp(tl) }); this.randomizeMapExtras(false); this.generateWorldName(false); this.updateOutputs(); new Notice('Full system rolled: name, UWP, map metadata, extras, and dossier direction.'); }
  clearBases(update) { this.state.bases = new Set(); if (update) this.updateOutputs(); }
  randomizeTravellerMapData() { const v = this.values(); this.state.popMultiplier = v.pop === 0 ? 0 : Math.floor(Math.random()*9)+1; this.state.belts = Math.random() < 0.55 ? 0 : Math.floor(Math.random()*3)+1; this.state.gasGiants = Math.random() < 0.67 ? Math.floor(Math.random()*3)+1 : 0; this.state.gasGiant = this.state.gasGiants > 0; this.updatePbgFromFields(); const stars = [rollStellar()]; if (Math.random() < 0.18) stars.push(rollStellar()); if (Math.random() < 0.04) stars.push(rollStellar()); this.state.stars = stars; this.state.stellar = stars.join(' '); this.state.worldCount = rollWorldCount(this.state.belts, this.state.gasGiants); const codes = this.getTradeCodes(); this.state.importance = rollImportance(v, codes, v.starport); this.state.routeRole = importanceBand(this.state.importance); this.updateFuelFromSystem(); this.updateOutputs(); new Notice('Traveller map metadata randomized.'); }
  randomizeMapExtras(show) { const v = this.values(); this.clearBases(false); if (['A','B'].includes(v.starport) && Math.random() < 0.35) this.state.bases.add('Naval'); if (['A','B','C','D'].includes(v.starport) && Math.random() < 0.30) this.state.bases.add('Scout'); if (['A','B','C'].includes(v.starport) && Math.random() < 0.12) this.state.bases.add('Research'); if (['A','B','C'].includes(v.starport) && ['Sallowfall Holdings','Corporate Client'].includes(this.state.allegiance) && Math.random() < 0.45) this.state.bases.add('Corporate'); if (['D','E','X'].includes(v.starport) && Math.random() < 0.08) this.state.bases.add('Pirate'); if (Math.random() < 0.04) this.state.bases.add('Ancient Site'); if (this.state.allegiance === 'Autocracy' && ['A','B','C'].includes(v.starport) && Math.random() < 0.30) this.state.bases.add('Military'); let zone = suggestZoneValue(v.starport, v.atm, v.law, v.pop); if (zone === 'Green') { if (Math.random() < 0.06) zone = 'Amber'; if (v.law >= 9 && Math.random() < 0.35) zone = 'Amber'; } if ((v.atm === 11 || v.atm === 12 || v.law >= 13) && Math.random() < 0.18) zone = 'Red'; if (v.pop === 0 && v.starport === 'X' && Math.random() < 0.10) zone = 'Red'; this.state.zone = zone; this.randomizeTravellerMapData(); this.applyGenerationBiases(); this.updateOutputs(); if (show) new Notice('Map extras randomized.'); }
  suggestZone() { const v = this.values(); this.state.zone = suggestZoneValue(v.starport, v.atm, v.law, v.pop); this.updateOutputs(); new Notice(`Zone set to ${this.state.zone}.`); }
  calculateNeighbors() { const cols = clamp(this.plugin.settings.subsectorColumns || 10,1,99); const rows = clamp(this.plugin.settings.subsectorRows || 16,1,99); this.state.jump1Neighbors = reachableHexes(this.state.hex, 1, cols, rows); this.state.jump2Neighbors = reachableHexes(this.state.hex, 2, cols, rows); this.updateOutputs(); new Notice('Jump neighbor hexes calculated.'); }
  getSecLine() { const bases = getBaseCodes(this.state.bases).join('') || '-'; const remarks = this.getTradeCodes().join(' ') || '-'; const z = zoneCode(this.state.zone); const pbg = this.state.pbg || `${this.state.popMultiplier || 0}${this.state.belts || 0}${this.state.gasGiants || 0}`; return `${this.state.hex || '0000'} ${this.state.name || 'Unnamed'} ${this.getUwp()} ${bases} ${remarks} ${z} ${pbg} ${this.state.allegianceCode || deriveAllegianceCode(this.state.allegiance)} ${this.state.stellar || ''}`.trim(); }
  importSecLine(text) { const line = String(text || '').trim(); if (!line) { new Notice('Paste a SEC line first.'); return; } const parts = line.split(/\s+/); const hex = parts.shift(); const uwpIndex = parts.findIndex(t => /^[ABCDEX][0-9A-F]{6}-[0-9A-F]$/i.test(t)); if (!hex || uwpIndex < 1) { new Notice('Could not parse SEC line.'); return; } this.state.hex = hex; this.state.name = titleCaseName(parts.slice(0, uwpIndex).join(' ')); const uwp = parts[uwpIndex].toUpperCase(); this.state.starport = uwp[0]; this.state.size = HEX.indexOf(uwp[1]); this.state.atm = HEX.indexOf(uwp[2]); this.state.hydro = HEX.indexOf(uwp[3]); this.state.pop = HEX.indexOf(uwp[4]); this.state.gov = HEX.indexOf(uwp[5]); this.state.law = HEX.indexOf(uwp[6]); this.state.tl = HEX.indexOf(uwp[8]); let rest = parts.slice(uwpIndex + 1); this.clearBases(false); const baseToken = rest.shift() || '-'; Object.entries(BASE_CODES).forEach(([name, code]) => { if (baseToken.includes(code)) this.state.bases.add(name); }); const zoneAt = rest.findIndex(t => ['-','A','R','Green','Amber','Red'].includes(t)); const remarks = zoneAt >= 0 ? rest.slice(0, zoneAt) : []; if (zoneAt >= 0) { const z = rest[zoneAt]; this.state.zone = z === 'A' ? 'Amber' : z === 'R' ? 'Red' : z === '-' ? 'Green' : z; rest = rest.slice(zoneAt + 1); } if (rest[0] && /^[0-9]{3}$/.test(rest[0])) { this.state.pbg = rest.shift(); this.state.popMultiplier = parseInt(this.state.pbg[0],10); this.state.belts = parseInt(this.state.pbg[1],10); this.state.gasGiants = parseInt(this.state.pbg[2],10); this.state.gasGiant = this.state.gasGiants > 0; } if (rest[0]) this.state.allegianceCode = rest.shift(); if (rest.length) { this.state.stellar = rest.join(' '); this.state.stars = [this.state.stellar]; } this.updateFuelFromSystem(); this.updateOutputs(); new Notice('SEC line imported.'); }
  async copyText(text) { await navigator.clipboard.writeText(text); new Notice('Copied.'); }
  uwpMeaningMarkdown() {
    const v = this.values();
    return `## UWP Code Reference
The mainworld UWP is **${this.getUwp()}**. Read it as **Starport / Size / Atmosphere / Hydrographics / Population / Government / Law - Tech Level**.

| Code | Field | Meaning |
|---|---|---|
| ${v.starport} | Starport | ${STARPORTS[v.starport] || 'Unknown starport quality'} |
| ${hx(v.size)} | Size | ${sizeLabel(v.size)} |
| ${hx(v.atm)} | Atmosphere | ${ATMOSPHERES[v.atm] || 'Unusual atmosphere'} |
| ${hx(v.hydro)} | Hydrographics | ${hydroLabel(v.hydro)} |
| ${hx(v.pop)} | Population | ${populationLabel(v.pop)} |
| ${hx(v.gov)} | Government | ${GOVERNMENTS[v.gov] || 'Unusual government'} |
| ${hx(v.law)} | Law Level | ${lawLabel(v.law)} |
| ${hx(v.tl)} | Tech Level | ${tlLabel(v.tl)} |

This describes the **mainworld**, not every body in the system. System-level notes such as gas giants, belts, routes, bases, fuel, and secondary worlds are tracked separately in metadata and system sections.`;
  }

  supportBody(supportType, title) {
    const name = this.state.name || 'Unnamed';
    const v = this.values();
    const codes = this.getTradeCodes();
    const bases = Array.from(this.state.bases || []);
    const profile = this.dossierProfile();
    const routeBits = [];
    if (this.state.tradeRoute) routeBits.push('trade-route brokers');
    if (this.state.patrolRoute) routeBits.push('patrol contacts');
    if (this.state.xboatRoute) routeBits.push('message-route officials');
    if (this.state.gasGiants > 0) routeBits.push('gas-giant refuelling crews');
    if (this.state.belts > 0) routeBits.push('belt workers and claimants');
    const routeText = routeBits.length ? routeBits.join(', ') : 'local port workers and mainworld authorities';
    const tradeText = codes.length ? codes.join(', ') : 'no dominant trade codes';
    const baseText = bases.length ? bases.join(', ') : 'no formal base presence';
    const lawText = v.law <= 3 ? 'loose law' : v.law <= 6 ? 'moderate law' : v.law <= 9 ? 'strict law' : 'severe law';
    const commonIntro = `This support note belongs to **${this.systemName()}** at hex **${this.state.hex}**. Mainworld UWP: **${this.getUwp()}**; trade codes: **${tradeText}**; bases: **${baseText}**; travel zone: **${this.state.zone}**.`;
    const blocks = {
      npcs: `${commonIntro}\n\n## Likely NPC Types\n- **Port gatekeeper or traffic controller** — Someone who knows arrivals, delays, fuel access, and which captains are lying about their business.\n- **Local broker or fixer** — Useful for cargo, permits, rumors, introductions, and quiet warnings about ${name}'s real power structure.\n- **Authority figure** — A magistrate, administrator, security chief, cooperative chair, company officer, or commandant shaped by ${lawText}.\n- **Working specialist** — Mechanic, medic, survey tech, crop forecaster, belt prospector, comms operator, or life-support engineer who understands what outsiders miss.\n- **Pressure-point NPC** — Someone caught between ${profile.pressures.slice(0,2).join(' and ') || 'local obligations and offworld leverage'}.\n\n## Good First Questions\n- Who can make a crew's visit easier without appearing to help?\n- Who knows the difference between the official map and the useful map?\n- Who would talk if the Travellers solved one immediate practical problem?`,
      factions: `${commonIntro}\n\n## Likely Faction Shapes\n- **Local authority** — The people who formally run courts, customs, licenses, emergency services, or civic order.\n- **Economic interest** — A cooperative, corporate office, freight combine, guild, claim office, estate, or lender tied to ${tradeText}.\n- **Port or traffic faction** — Brokers, fuel crews, inspectors, stevedores, patrol staff, or ${routeText}.\n- **Informal opposition** — Labor organizers, smugglers, reformers, old families, dissidents, rival claimants, or people simply tired of the current arrangement.\n\n## Faction Tension Seeds\n- Who controls access to fuel, repairs, cargo priority, or landing permission?\n- Who benefits if ${name} stays exactly as it is?\n- Who would gain power if offworld attention arrived at the wrong time?`,
      rumors: `${commonIntro}\n\n## Rumor Seeds\n- A routine port procedure is being used to measure loyalty, debt, or leverage.\n- Someone has been editing a record that most visitors would assume is boring: traffic, harvest, weather, fuel, claims, or cargo.\n- The public reason for the ${this.state.zone} rating is ${this.state.zone === 'Green' ? 'reassuring, but not the whole story' : 'incomplete or politically convenient'}.\n- A respected local knows more than they can safely say in an official room.\n- The useful rumor is not hidden in a palace; it is circulating among ${routeText}.\n\n## Truth Values To Assign Later\nMark each rumor as **true**, **false**, or **half-true** when the system becomes important.`,
      ships_traffic: `${commonIntro}\n\n## Traffic Hints\n- **Expected traffic:** ${routeText}.\n- **Fuel situation:** ${(this.state.fuelSources || []).join(', ') || 'fuel source not yet established'}.\n- **Port friction:** ${v.starport === 'X' ? 'No formal starport; every landing is an arrangement.' : v.starport === 'E' ? 'Minimal port services; captains plan around scarcity.' : v.starport === 'D' ? 'Poor port services; repairs and fuel may involve favors.' : v.starport === 'C' ? 'Routine port services with local habits and bottlenecks.' : 'High-grade services with more oversight and more interested parties.'}\n\n## Useful Ship/Traffic Questions\n- Which route matters more: official traffic, wilderness refuelling, belt work, patrol movement, or quiet smuggling?\n- What ship arrived recently enough that everyone noticed?\n- What cargo would make the locals nervous if it appeared on a manifest?`,
      sessions: `${commonIntro}\n\n## Session Use\nUse this note to track what happened when the Travellers visited ${name}.\n\n## Open Threads\n- What did the crew change in the port, local economy, or rumor network?\n- Which NPCs now owe them, resent them, or need them?\n- Did they create a new route, expose a secret, damage a faction, or make a future visit harder?\n\n## Visit Log\n- **Date / Session:**\n  - Arrival point:\n  - Job or complication:\n  - NPCs met:\n  - Consequences:`
    };
    return blocks[supportType] || `${commonIntro}\n\n## Notes\n- Add details here when ${name} becomes important in play.`;
  }

  systemNoteContent() { const mainworldLink = `[[${this.mainworldNotePathNoExt()}|${this.state.name || 'Unnamed'}]]`; const body = this.plugin.settings.createNoteTemplate ? `
# ${this.systemName()} — Hex ${this.state.hex || '0000'}

## Map Line
\`${this.getMapLine()}\`

${this.uwpMeaningMarkdown()}

## Primary Bodies
- Mainworld: ${mainworldLink}
- Gas giants: ${this.state.gasGiants || 0}
- Belts: ${this.state.belts || 0}
- Other worlds/bodies: ${Math.max(0, (this.state.worldCount || 1) - 1)}
- Stellar: ${this.state.stellar || 'Unknown'}

## Fuel and Traffic
- Fuel sources: ${(this.state.fuelSources || []).join(', ') || 'None recorded'}
- Route role: ${this.state.routeRole || 'backwater'}
- Starport facilities: ${this.state.starportFacilities || 'not yet detailed'}

## System Notes
Use this section for details that belong to the whole system: jump arrival, traffic patterns, gas giant operations, belts, moons, stations, patrol behavior, and anything that is not strictly on the mainworld.

## Referee Notes

## Expansion Links
- ${mainworldLink}
- [[NPCs]]
- [[Factions]]
- [[Rumors]]
- [[Ships and Traffic]]
- [[Sessions]]
` : ''; return `${this.getSystemYaml()}
${body}`; }

  dossierProfile() {
    const v = this.values();
    const codes = this.getTradeCodes();
    const bases = Array.from(this.state.bases || []);
    const tags = [];
    const add = t => { if (t && !tags.includes(t)) tags.push(t); };
    if (v.atm <= 1) add('vacuum'); else if ([2,3,4,5,14].includes(v.atm)) add('thin_atmo'); else if ([6,7,8,9,13].includes(v.atm)) add('standard_atmo'); else add('hostile_atmo');
    if (v.hydro === 0) add('dry'); else if (v.hydro >= 8) add('wet'); else add('mixed_water');
    if (v.pop <= 3) add('low_pop'); else if (v.pop <= 6) add('mid_pop'); else if (v.pop <= 8) add('busy_pop'); else add('high_pop');
    if (v.law <= 3) add('loose_law'); else if (v.law <= 6) add('moderate_law'); else if (v.law <= 9) add('strict_law'); else add('severe_law');
    if (['A','B'].includes(v.starport)) add('excellent_port'); else if (['C','D'].includes(v.starport)) add('ordinary_port'); else add('poor_port');
    codes.forEach(c => add(`tc_${c}`));
    bases.forEach(b => add(`base_${String(b).toLowerCase().replace(/\s+/g,'_')}`));
    if (this.state.zone === 'Amber') add('amber_zone');
    if (this.state.zone === 'Red') add('red_zone');
    if (this.state.allegiance === 'Sallowfall Holdings' || this.state.allegiance === 'Corporate Client') add('corporate');
    if (this.state.allegiance === 'Autocracy') add('autocracy');
    if (this.state.gasGiants > 0) add('gas_giants');
    if (this.state.belts > 0) add('belts');
    if (this.state.tradeRoute || this.state.xboatRoute || this.state.patrolRoute) add('route_system');
    if ((this.state.weirdnessLevel || 0) >= 55 || bases.includes('Ancient Site')) add('weird');
    if ((this.state.frontierCore || 0) <= 30) add('frontier');
    if ((this.state.frontierCore || 0) >= 70) add('coreward');

    const archetypes = [];
    const addArch = (id, score, reason) => archetypes.push({ id, score, reason });
    addArch('frontier_refuel_stop', 5 + (tags.includes('frontier') ? 5 : 0) + (tags.includes('gas_giants') ? 3 : 0) + (tags.includes('poor_port') ? 2 : 0), 'remote traffic and fuel shape the system');
    addArch('corporate_breadbasket', (tags.includes('corporate') ? 7 : 0) + (codes.includes('Ag') ? 8 : 0) + (v.pop >= 5 ? 2 : 0), 'agriculture and contract leverage define local politics');
    addArch('corporate_extraction_world', (tags.includes('corporate') ? 6 : 0) + ((codes.includes('In') || codes.includes('Na') || codes.includes('Po') || tags.includes('belts')) ? 6 : 0), 'resource control and logistics create the local order');
    addArch('autocratic_checkpoint', (tags.includes('autocracy') ? 8 : 0) + (v.law >= 7 ? 4 : 0) + (tags.includes('route_system') ? 4 : 0), 'permissions, credentials, and transit control matter more than local charm');
    addArch('decaying_industrial_hub', (codes.includes('In') ? 7 : 0) + (v.tl <= 9 ? 2 : 0) + (this.state.zone !== 'Green' ? 3 : 0), 'industrial capacity is useful, aging, and politically loaded');
    addArch('garden_client_world', ((codes.includes('Ga') || codes.includes('Ri')) ? 6 : 0) + (tags.includes('standard_atmo') ? 2 : 0) + (tags.includes('corporate') ? 3 : 0), 'comfort and dependency coexist');
    addArch('survey_outpost', (v.pop <= 3 ? 7 : 0) + (bases.includes('Scout') ? 5 : 0) + (tags.includes('frontier') ? 3 : 0), 'a small population lives around knowledge, beacons, and maintenance');
    addArch('administrative_capital', (v.pop >= 7 ? 4 : 0) + (v.law >= 7 ? 5 : 0) + (['A','B'].includes(v.starport) ? 3 : 0), 'bureaucracy and official visibility are the local terrain');
    addArch('amber_port_of_convenience', (this.state.zone === 'Amber' ? 6 : 0) + (tags.includes('route_system') ? 4 : 0) + (['B','C','D'].includes(v.starport) ? 2 : 0), 'captains keep using a place everyone has been warned about');
    addArch('belt_service_economy', (tags.includes('belts') ? 8 : 0) + (codes.includes('In') ? 2 : 0) + (tags.includes('gas_giants') ? 2 : 0), 'the mainworld is only part of a wider working system');
    addArch('quarantine_adjacent_world', (this.state.zone === 'Red' ? 8 : 0) + (this.state.zone === 'Amber' ? 3 : 0) + (tags.includes('hostile_atmo') ? 2 : 0) + (tags.includes('weird') ? 3 : 0), 'official caution is a playable fact');
    addArch('quiet_cultural_node', (v.pop >= 4 && v.pop <= 8 ? 4 : 0) + (codes.includes('Ri') ? 2 : 0) + (tags.includes('route_system') ? 1 : 0) + ((this.state.dossierStyle || '') === 'Balanced' ? 2 : 0), 'influence travels farther than the system’s ships');
    addArch('weird_old_system', (tags.includes('weird') ? 9 : 0) + (bases.includes('Ancient Site') ? 6 : 0) + (this.state.zone !== 'Green' ? 2 : 0), 'old traces and present politics disturb each other');
    addArch('trade_lane_pressure_cooker', (tags.includes('route_system') ? 7 : 0) + (['A','B','C'].includes(v.starport) ? 3 : 0) + (this.state.importance >= 1 ? 3 : 0), 'traffic creates money, attention, and leverage');

    let existing = [];
    try { existing = this.getSystemRecords ? this.getSystemRecords() : []; } catch (e) { existing = []; }
    const counts = {};
    existing.forEach(r => { if (r.archetype || r.dossier_archetype) counts[r.archetype || r.dossier_archetype] = (counts[r.archetype || r.dossier_archetype] || 0) + 1; });
    archetypes.forEach(a => { a.score -= Math.min(5, counts[a.id] || 0); });
    archetypes.sort((a,b) => b.score - a.score);
    const primary = archetypes[0] || { id: 'frontier_refuel_stop', score: 0, reason: 'useful system pressure' };
    const secondary = archetypes.find(a => a.id !== primary.id && a.score > 5) || archetypes[1] || { id: 'local_pressure_point', score: 0 };

    const premiseShapes = {
      frontier_refuel_stop: ['a remote system where fuel, repairs, favors, and reputation matter more than law', 'a stopover system whose small conveniences hide large dependencies', 'a practical frontier hinge where every arriving ship changes the local week'],
      corporate_breadbasket: ['a productive agricultural system whose export pipeline gives offworld interests quiet leverage', 'a food-producing mainworld where prosperity depends on contracts locals did not fully write', 'a stable breadbasket whose harvest data and freight windows are political weapons'],
      corporate_extraction_world: ['an extraction economy where ownership is less important than access to permits, parts, and transport', 'a working system where safety language and labor discipline conceal a fight over value', 'a resource system whose official efficiency depends on pushing risk outward'],
      autocratic_checkpoint: ['a controlled transit system where permission is the real currency', 'a formal checkpoint world where law, ritual, and security overlap', 'a route authority that treats every ship as both opportunity and threat'],
      decaying_industrial_hub: ['an industrial world whose usefulness has outlived the promises that built it', 'a working hub where aging systems, proud labor, and dirty politics share the same corridors', 'an industrial mainworld balancing productivity against consequences it would rather export'],
      garden_client_world: ['a comfortable client world where visible safety depends on invisible compromises', 'a pleasant mainworld whose prosperity has a sponsor and a price', 'a green, orderly place that teaches visitors how soft control can feel'],
      survey_outpost: ['a small outpost system where knowledge, maintenance, and isolation create local power', 'a survey community that survives by knowing what maps do not say', 'a minor system where every beacon, spare part, and rumor matters'],
      administrative_capital: ['a bureaucratic system where the form is often more dangerous than the law', 'an administrative center whose offices shape lives far beyond the starport', 'a system where paperwork is the most visible face of power'],
      amber_port_of_convenience: ['a useful system that captains keep visiting despite the warning marker', 'an Amber-rated stop where danger has been priced into ordinary commerce', 'a cautionary system that survives because too many people still need it'],
      belt_service_economy: ['a system where the mainworld is only one node in a wider belt economy', 'a working belt-and-port economy built on claims, salvage, fuel, and grudges', 'a service system whose real life happens between plotted orbits'],
      quarantine_adjacent_world: ['a restricted system where safety protocols are also political tools', 'a caution-marked world where the official risk may not be the only risk', 'a system where containment language shapes daily life'],
      quiet_cultural_node: ['a modest system whose customs, education, faith, or art travel farther than its ships', 'a local cultural center with influence too subtle for the map line', 'a system that wins arguments through memory, prestige, and social expectation'],
      weird_old_system: ['a system where something old still bends present-day behavior', 'a place where old ruins, bad data, and local taboo point at the same absence', 'a system whose strangest feature has been normalized by the people who live around it'],
      trade_lane_pressure_cooker: ['a traffic-heavy system where commerce compresses problems until someone has to act', 'a route node where strangers, money, and authority collide daily', 'a busy transit system whose stability depends on keeping many small lies moving']
    };
    const rand = seededRandom(`${this.state.hex}|${this.state.name}|${this.getUwp()}|profile-v3`);
    const premise = pick(premiseShapes[primary.id] || ['a system with a local contradiction worth bringing to the table'], rand);
    const tone = [];
    if (tags.includes('corporate')) tone.push('polite pressure');
    if (tags.includes('autocracy')) tone.push('formal control');
    if (tags.includes('frontier')) tone.push('practical frontier');
    if (tags.includes('weird')) tone.push('uneasy mystery');
    if (tags.includes('coreward')) tone.push('busy coreward');
    if (!tone.length) tone.push('grounded Traveller');
    const pressures = [];
    if (codes.includes('Ag')) pressures.push('harvest contracts');
    if (codes.includes('In')) pressures.push('industrial certification');
    if (codes.includes('Po')) pressures.push('managed scarcity');
    if (tags.includes('corporate')) pressures.push('service contracts');
    if (tags.includes('autocracy')) pressures.push('permits and credentials');
    if (tags.includes('route_system')) pressures.push('traffic priority');
    if (tags.includes('gas_giants')) pressures.push('fuel access');
    if (tags.includes('belts')) pressures.push('claim rights');
    if (tags.includes('weird')) pressures.push('restricted knowledge');
    if (!pressures.length) pressures.push('local reputation');
    return { tags, primary: primary.id, secondary: secondary.id, premise, tone, pressures, archetypeReason: primary.reason, counts };
  }

  dossierYamlLines() {
    const p = this.dossierProfile();
    return [
      'dossier_engine_version: "4.1"',
      `dossier_archetype: "${yamlString(p.primary)}"`,
      `dossier_secondary_archetype: "${yamlString(p.secondary)}"`,
      `dossier_premise: "${yamlString(p.premise)}"`,
      `dossier_tone: ${safeJsonArray(p.tone)}`,
      `dossier_pressure_sources: ${safeJsonArray(p.pressures)}`,
      `dossier_context_tags: ${safeJsonArray(p.tags)}`,
      'dossier_generated_with_memory: true',
      'dossier_safe_blocks: true',
      'dossier_generator_architecture: "archetype_pressure_microrealizer"',
      'dossier_quality_mode: "best_of_8_linted"',
      'dossier_output_style: "artifact_free_markdown"'
    ];
  }

  starterDossierSections() {
    const v = this.values();
    const name = this.state.name || 'Unnamed';
    const codes = this.getTradeCodes();
    const bases = Array.from(this.state.bases || []);
    const profile = this.dossierProfile();
    const tags = new Set(profile.tags || []);
    const density = clamp(this.state.dossierDensity || 3, 1, 5);
    const has = t => tags.has(t);
    const baseSeed = `${this.state.hex}|${name}|${this.getUwp()}|${profile.primary}|${profile.secondary}|v4-master`;

    const textTitle = s => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const sentence = s => String(s || '').replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
    const joinSentence = parts => sentence(parts.filter(Boolean).join(' '));
    const chooseWith = rand => arr => pick(arr, rand);
    const article = word => /^[aeiou]/i.test(String(word || '')) ? 'an' : 'a';
    const listNatural = arr => {
      arr = (arr || []).filter(Boolean);
      if (arr.length === 0) return '';
      if (arr.length === 1) return arr[0];
      if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
      return `${arr.slice(0,-1).join(', ')}, and ${arr[arr.length - 1]}`;
    };

    const portProfile = (() => {
      const map = {
        A: { label: 'excellent starport', arrival: 'a disciplined highport/downport system', site: 'Highport', service: 'shipyard support, refined fuel, brokers, security, and traffic control', authority: 'port authority' },
        B: { label: 'good starport', arrival: 'a capable port complex', site: 'Port', service: 'repairs, refined fuel, freight offices, and formal customs', authority: 'customs office' },
        C: { label: 'routine starport', arrival: 'a working port with familiar bottlenecks', site: 'Port', service: 'basic repairs, fuel access, brokers, and local customs', authority: 'port office' },
        D: { label: 'poor starport', arrival: 'a rough port where every service has a story attached', site: 'Roughport', service: 'limited fuel, improvised repairs, and personal arrangements', authority: 'field office' },
        E: { label: 'frontier landing facility', arrival: 'a minimal landing field held together by habit and local favors', site: 'Landing Field', service: 'beacons, pads, fuel promises, and whatever help is awake', authority: 'landing coordinator' },
        X: { label: 'no formal starport', arrival: 'an unofficial landing culture rather than a true port', site: 'Landing Strip', service: 'local beacons, weather calls, and negotiated permission', authority: 'local authority' }
      };
      return map[v.starport] || map.C;
    })();

    const atmosphereProfile = (() => {
      if (v.atm <= 1) return { habitability: 'unforgiving', visual: 'sealed habitats, exposed rock, and hard shadows', daily: 'air discipline is a survival habit', phrase: 'vacuum or trace atmosphere' };
      if ([2,3,4,5,14].includes(v.atm)) return { habitability: 'thin-air', visual: 'pale skies, protected approaches, and settlements built around shelter', daily: 'filters, seals, and exposure planning are ordinary life', phrase: `${ATMOSPHERES[v.atm] || 'thin'} atmosphere` };
      if ([6,8].includes(v.atm)) return { habitability: 'habitable', visual: 'open settlements, visible roads, and weather systems that make the world look accessible', daily: 'the environment can be lived in directly, which lets the social hazards hide in plain sight', phrase: `${ATMOSPHERES[v.atm] || 'standard'} atmosphere` };
      if ([7,9].includes(v.atm)) return { habitability: 'habitable with caution', visual: 'settled regions and working weather, with filter warnings built into every approach advisory', daily: 'the air is usable, but maintenance and public health rules matter more than visitors expect', phrase: `${ATMOSPHERES[v.atm] || 'tainted'} atmosphere` };
      return { habitability: 'hostile', visual: 'controlled access corridors, warning zones, and infrastructure that matters more than scenery', daily: 'ordinary movement depends on equipment, permission, and procedure', phrase: `${ATMOSPHERES[v.atm] || 'hostile'} atmosphere` };
    })();

    const waterProfile = (() => {
      if (v.hydro === 0) return { label: 'dry', visual: 'dry basins, hard transport lines, and water infrastructure that reads like wealth', culture: 'water discipline is social etiquette as much as survival practice' };
      if (v.hydro >= 8) return { label: 'wet', visual: 'storm bands, sea lanes, wet lowlands, and settlements shaped by weather', culture: 'weather, tide, and evacuation language are part of ordinary competence' };
      return { label: 'mixed', visual: 'land, water, settlements, and transport corridors in a workable but uneven pattern', culture: 'locals think in terms of routes, seasons, and access rather than abstract distances' };
    })();

    const populationProfile = (() => {
      if (v.pop <= 3) return { band: 'small', social: 'everyone who matters is only one introduction away', scale: 'outpost-scale' };
      if (v.pop <= 6) return { band: 'settled', social: 'institutions exist, but reputations still move quickly', scale: 'settled but personal' };
      if (v.pop <= 8) return { band: 'busy', social: 'district, class, employer, and port access all change how the world feels', scale: 'busy and layered' };
      return { band: 'crowded', social: 'the mainworld contains many worlds of class, language, administration, and informal power', scale: 'crowded and institutional' };
    })();

    const pressureModels = [];
    const addPressure = (id, score, data) => pressureModels.push(Object.assign({ id, score }, data));
    addPressure('export_certification', (codes.includes('Ag') ? 8 : 0) + (has('corporate') ? 4 : 0) + (this.state.tradeRoute ? 2 : 0), {
      publicFace: 'quality control and shipping order', hiddenCost: 'certification decides who gets paid, fed, delayed, or quietly ruined',
      institutions: ['Harvest Office','Export Scale','Crop Insurance Desk','Freight Certification Hall','Seasonal Contract House'],
      verbs: ['certifies', 'delays', 'reprices', 'reroutes'], secret: 'A forecast or export certificate has been altered just enough to redirect money, food, or political blame.'
    });
    addPressure('port_access', (['D','E','X'].includes(v.starport) ? 6 : 2) + (has('frontier') ? 3 : 0) + (this.state.gasGiants > 0 ? 2 : 0), {
      publicFace: 'landing safety and traffic order', hiddenCost: 'whoever controls access controls which problems become urgent',
      institutions: ['Beacon Office','Landing Desk','Traffic Shed','Fuel Bond Office','Approach Control Room'],
      verbs: ['holds', 'clears', 'questions', 'misfiles'], secret: 'A routine arrival procedure is being used to sort useful visitors from inconvenient ones.'
    });
    addPressure('claim_control', (this.state.belts > 0 ? 7 : 0) + (codes.includes('In') || codes.includes('Na') ? 2 : 0), {
      publicFace: 'claim records and survey paperwork', hiddenCost: 'ownership is decided by files, not by who risked the work',
      institutions: ['Claim Queue','Survey Register','Belt Arbitration Desk','Salvage Cage','Prospector Court'],
      verbs: ['validates', 'buries', 'relabels', 'freezes'], secret: 'A belt claim or survey marker has been deliberately undervalued because the real find is not on the public chart.'
    });
    addPressure('permit_control', (v.law >= 7 ? 7 : 0) + (has('autocracy') ? 4 : 0) + (this.state.zone !== 'Green' ? 3 : 0), {
      publicFace: 'public safety and legal order', hiddenCost: 'permission itself is the scarce resource',
      institutions: ['Permit Court','Inspection Hall','Credential Bureau','Records Annex','Compliance Desk'],
      verbs: ['authorizes', 'questions', 'escorts', 'records'], secret: 'A permit exception has been granted for someone who should not have known how to ask for it.'
    });
    addPressure('maintenance_dependency', (v.atm <= 5 || v.atm >= 10 ? 5 : 0) + (codes.includes('Na') || codes.includes('Po') ? 3 : 0), {
      publicFace: 'maintenance schedules and safety checks', hiddenCost: 'technical dependency becomes social hierarchy',
      institutions: ['Filter Cooperative','Scrubber House','Parts Bond Office','Life-Support Yard','Pressure Guild'],
      verbs: ['rations', 'repairs', 'audits', 'prioritizes'], secret: 'Maintenance records reveal a pattern of favoritism that the official budget cannot explain.'
    });
    addPressure('traffic_data', ((this.state.tradeRoute || this.state.xboatRoute || this.state.patrolRoute) ? 6 : 1) + (this.state.gasGiants > 0 ? 2 : 0), {
      publicFace: 'traffic coordination and route safety', hiddenCost: 'the useful map is not the public map',
      institutions: ['Route Desk','Traffic Archive','Dispatch Gallery','Patrol Liaison Office','Far Beacon Station'],
      verbs: ['logs', 'erases', 'prioritizes', 'flags'], secret: 'The traffic record is accurate until one compares it to fuel consumption and departure windows.'
    });
    pressureModels.sort((a,b) => b.score - a.score);

    function pickPressure(rand) {
      const viable = pressureModels.filter(p => p.score > 0);
      if (!viable.length) return pressureModels[1];
      const top = viable.slice(0, Math.min(3, viable.length));
      return top[Math.floor(rand() * top.length)];
    }

    const records = this.getSystemRecords ? this.getSystemRecords() : [];
    const nearbyArchetypes = new Set(records.filter(r => r.hex && r.hex !== this.state.hex).slice(-20).map(r => r.archetype || r.dossier_archetype).filter(Boolean));

    const baseVerb = v => ({ validates:'validate', buries:'bury', relabels:'relabel', freezes:'freeze', authorizes:'authorize', questions:'question', escorts:'escort', records:'record', rations:'ration', repairs:'repair', audits:'audit', prioritizes:'prioritize', logs:'log', erases:'erase', flags:'flag' }[v] || String(v || 'delay').replace(/ies$/, 'y').replace(/s$/, ''));
    const cap = str => String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1);
    const concreteIssue = () => choose(['a missed inspection window','a disputed service tag','an altered clearance note','a priority berth that should not exist','a delayed repair chit','a cargo seal with the wrong authority stamp','a weather hold that benefits the wrong ship']);
    const institutionNoun = inst => String(inst || 'office').replace(/^(The )/i, '');

    const candidateCount = 12;
    let best = null;
    for (let i = 0; i < candidateCount; i++) {
      const rand = seededRandom(`${baseSeed}|candidate-${i}`);
      const choose = chooseWith(rand);
      const pressure = pickPressure(rand);
      const primary = profile.primary || 'local_system';
      const secondary = profile.secondary || 'secondary_pressure';
      const premise = sentence(`${cap(pressure.publicFace)} shape the local order, while ${pressure.hiddenCost}.`);

      const approachFeatures = [];
      if (this.state.belts > 0) approachFeatures.push('belt claim traffic');
      if (this.state.gasGiants > 0) approachFeatures.push('the gas-giant fuel lane');
      if (this.state.tradeRoute) approachFeatures.push('scheduled freight traffic');
      if (this.state.patrolRoute) approachFeatures.push('patrol check-ins');
      if (this.state.xboatRoute) approachFeatures.push('message-route discipline');
      if (!approachFeatures.length) approachFeatures.push(portProfile.arrival);

      const firstView = [
        `${name} does not present itself as a single postcard world. From the jump limit, crews read ${listNatural(approachFeatures.slice(0, 3))} before the mainworld becomes the whole story. ${this.state.belts > 0 ? 'The belt gives the system a working life that can cooperate with mainworld authority, ignore it, or quietly contradict it.' : 'The approach tells visitors who watches traffic, who answers late, and where a ship can become somebody else\'s problem.'}`,
        `The planet itself shows ${waterProfile.visual}. Its ${atmosphereProfile.phrase} makes the first impression ${atmosphereProfile.habitability}; ${atmosphereProfile.daily}.`,
        (density >= 4 || this.state.zone !== 'Green') ? `The first warnings are practical rather than dramatic: clearance notes, hazard calls, fuel instructions, and local phrases that make more sense after a crew has already committed to the approach.` : ''
      ].filter(Boolean);

      const tradeFocus = [];
      if (codes.includes('Ag')) tradeFocus.push('harvest timing');
      if (codes.includes('In')) tradeFocus.push('shift work and industrial safety');
      if (codes.includes('Ri')) tradeFocus.push('respectability and patronage');
      if (codes.includes('Po')) tradeFocus.push('credit and scarcity');
      if (codes.includes('Na')) tradeFocus.push('imports and maintenance');
      if (codes.includes('Hi')) tradeFocus.push('district politics');
      if (!tradeFocus.length) tradeFocus.push('port access', 'local labor', 'reputation');

      const surface = [
        `${name} feels ${populationProfile.scale} at ground level: ${populationProfile.social}. Daily life turns on ${listNatural(tradeFocus.slice(0, 3))}, but the real schedule is often set by the office that can ${baseVerb(choose(pressure.verbs))} ${concreteIssue()} without making the decision look personal.`,
        `${premise} Residents usually treat this as common sense. Visitors tend to discover it when a broker, clerk, mechanic, inspector, or relative of the wrong person turns an ordinary task into a negotiation.`,
        (density >= 5) ? `The official map is useful for roads and districts; the working map is made of favors, debts, maintenance windows, safe rooms, and names that open doors faster than credentials.` : ''
      ].filter(Boolean);

      const lawTone = v.law <= 3 ? 'loose enough that custom and reputation do much of the work' : v.law <= 6 ? 'moderate: normal crews can function here, but careless weapons, cargo, tools, or lies will still draw attention' : v.law <= 9 ? 'strict: permits, inspections, searches, and official questions are part of the cost of arrival' : 'severe: permission is a resource, and procedure is one of the ways power announces itself';
      const allegianceLine = this.state.allegiance === 'Independent' ? 'The independence is local, personal, and practical; authority tends to have names rather than distant slogans.' :
        (this.state.allegiance === 'Sallowfall Holdings' || this.state.allegiance === 'Corporate Client') ? 'Power prefers clean language: safety policy, service access, bonded contracts, and schedules that leave little room for open argument.' :
        this.state.allegiance === 'Autocracy' ? 'Authority is formal and visible. Correct behavior can matter as much as correct paperwork, and public mistakes travel quickly.' :
        `The wider allegiance of ${this.state.allegiance || 'Independent'} shapes which outsiders are trusted, delayed, watched, or quietly priced out.`;
      const govLaw = [
        `${name} is formally governed as ${String(GOVERNMENTS[v.gov] || 'local authority').toLowerCase()}. In play, that authority appears through ${listNatural([portProfile.authority, choose(pressure.institutions), v.law >= 7 ? 'inspectors' : 'local offices'].filter(Boolean))}, not as an abstract civics lesson.`,
        `Law level ${hx(v.law)} is ${lawTone}. ${allegianceLine}`,
        (this.state.zone !== 'Green') ? `The ${this.state.zone} Zone rating is not just a label on the map. Locals have an official explanation for it, and the useful question is what that explanation leaves out.` : ''
      ].filter(Boolean);

      const cultureLines = [];
      cultureLines.push(`${waterProfile.culture}. ${atmosphereProfile.daily.charAt(0).toUpperCase() + atmosphereProfile.daily.slice(1)}.`);
      if (v.pop <= 3 || has('frontier')) cultureLines.push('Competence is remembered because anonymity is scarce; help given in the right moment can matter more than formal rank.');
      else if (v.pop >= 7) cultureLines.push('Culture changes by district, employer, port access, and class; the first local someone meets is never the whole world.');
      if (codes.includes('Ag')) cultureLines.push('People speak about seasons, machines, family, debt, and shipping windows as if they are one subject.');
      if (codes.includes('In')) cultureLines.push('Visible work earns respect, while vague promises about safety or schedules are treated as insults.');
      if (has('corporate')) cultureLines.push('Locals know how to hear pressure inside polite language. The dangerous sentence is often the one that sounds most reasonable.');
      if (has('autocracy')) cultureLines.push('Public behavior is careful without always being fearful; people know which opinions belong in which rooms.');
      const culture = [sentence(cultureLines.slice(0, Math.min(4, density + 1)).join(' ')),
        `Common courtesies: respect ${choose(['schedules','maintenance routines','weather warnings','local introductions','work crews'])}; do not mock ${choose(['paperwork','scarcity habits','port delays','filter checks','family obligations'])}; ask who is responsible before assuming who is powerful}.`.replace('powerful}.','powerful.')
      ];

      const usedLoc = new Set();
      const locs = [];
      const locName = (prefixes, nouns) => `${choose(prefixes)} ${choose(nouns)}`.replace(/\s+/g,' ').trim();
      const addLoc = (role, title, desc) => {
        title = sentence(title).replace(/[.!?]$/,'');
        if (!title || usedLoc.has(title)) return;
        usedLoc.add(title);
        locs.push({ role, title, desc: sentence(desc) });
      };

      const arrivalTitle = v.starport === 'A' ? `${name} Highport` : v.starport === 'B' || v.starport === 'C' ? `${portProfile.site} ${name}` : `${name} ${portProfile.site}`;
      addLoc('arrival', arrivalTitle, `The main arrival point, with ${portProfile.service}; crews learn quickly which procedures are real rules and which are local habits.`);
      addLoc('public', locName(['The Lower','The Glass','The Old','The Portside','The Windward','The Market'], ['Exchange','Steps','Arcade','Gallery','Broker Row','Mess Hall']), `A public place where rumors become introductions and introductions become obligations; it is safer than a back room but less neutral than it looks.`);
      addLoc('pressure', locName(['Koss','Merrit','Vance','Ondari','Rell','Northbright','Lowmere'], pressure.institutions), `The local face of ${pressure.publicFace}; its records decide who waits, who works, and who gets told that the delay is nobody's fault.`);
      if (this.state.belts > 0) addLoc('system_space', choose(['Prospector Queue','Belt Arbitration Desk','Far Rock Yards','Claim Nine Dispatch','Debris Register']), 'The belt has its own working map: miners, salvagers, survey crews, claim records, and cargoes that may never pass through the mainworld.');
      if (this.state.gasGiants > 0) {
        const fuelSites = [
          ['Deepwell Tender Berth', 'A rough refuelling berth where skimmer crews trade pump priority, weather warnings, and rumors before the cargo ever reaches polite port traffic.'],
          ['Grey Lantern Fuel Lane', 'A marked approach through the gas-giant traffic pattern where captains watch each other for bad math, hidden escorts, and tanks topped off under the wrong name.'],
          ['Night-Side Skim Office', 'A cramped dispatch room that sells clean timing windows and knows which crews are desperate enough to accept a dangerous pass.'],
          ['Blue-Giant Waiting Line', 'A queue of tankers, cutters, and impatient free traders where local etiquette is enforced by people with little patience and very good sensors.']
        ];
        const fs = pick(fuelSites, rand);
        addLoc('fuel', fs[0], fs[1]);
      }
      if (this.state.zone !== 'Green' || v.law >= 8) addLoc('authority', locName(['Restricted','Permit','Inspection','Compliance','Records'], ['Annex','Hall','Desk','Cage','Office','Vault']), 'A procedural place where a small exception can be worth more than a large bribe, especially when a signature turns delay into policy.');
      if (has('weird') || bases.includes('Ancient Site')) addLoc('weird', locName(['Silent','Black','Old','Blind','Buried'], ['Marker','Array','Beacon','Survey','Spire','Vault']), 'Locals route around it with practiced ease, but their explanations do not agree with the survey record.');
      const localTemplates = [
        ['Signal House', 'A communications room where late messages, missing acknowledgements, and family obligations become the same knot of trouble.'],
        ['Filter Cooperative', 'A practical institution that keeps settlements breathing and quietly knows who has been skipping maintenance.'],
        ['Weather Office', 'A respected forecasting post whose public warnings are simple, while its private models decide who gets to move.'],
        ['Clinic Queue', 'A public waiting room where injuries, gossip, labor shortages, and unpaid favors arrive in the same hour.'],
        ['Reservoir Lock', 'A guarded infrastructure point where water, access, and local authority are impossible to separate.'],
        ['Cargo Quay', 'A working platform where crews can see which freight is urgent, which is political, and which has no official owner.'],
        ['Relay Yard', 'A maintenance yard full of patched equipment, tired specialists, and the kind of records nobody audits until something explodes.']
      ];
      while (locs.length < Math.min(6, density + 3)) {
        const lt = pick(localTemplates, rand);
        addLoc('local', `${pick(['Morrow','Mira','Harrow','Aster','Vale','Dain','Sable'], rand)} ${lt[0]}`, lt[1]);
      }

      const secrets = [];
      const addSecret = s => { s = sentence(s); if (s && !secrets.includes(s)) secrets.push(s); };
      addSecret(pressure.secret);
      if (this.state.belts > 0) addSecret('One belt-side record does not match the mainworld archive, and the mismatch is small enough that only a working crew would notice it.');
      if (this.state.gasGiants > 0) addSecret('A refuelling contact keeps a private traffic list that is more accurate than the official one.');
      if (this.state.zone !== 'Green') addSecret(`The ${this.state.zone} advisory is justified, but the public reason is incomplete in a way that protects someone local.`);
      if (has('corporate')) addSecret('The real chain of command is written into a service contract rather than a law code.');
      if (has('autocracy')) addSecret('A loyal official is hiding a failure because reporting it honestly would be treated as disloyalty.');
      if (has('weird')) addSecret('An old system feature still affects sensor returns, local taboos, or navigation decisions.');
      while (secrets.length < Math.min(4, density + 1)) addSecret(choose([
        'A respected local is waiting for outsiders useful enough to risk telling the truth.',
        'The visible problem is only a symptom of a quieter dependency.',
        'A favor offered early in the visit is also a test of who the crew will inconvenience.',
        'Someone has made a boring record correct in every detail except the one that matters.'
      ]));

      const md = `## First View from Orbit
${firstView.join('\n\n')}

## Surface Reality
${surface.join('\n\n')}

## Government and Law
${govLaw.join('\n\n')}

## Culture
${culture.filter(Boolean).join('\n\n')}

## Locations
${locs.slice(0, Math.min(6, density + 3)).map((x, idx) => `${idx + 1}. **${x.title}** — ${x.desc}`).join('\n')}

## Referee Secrets
${secrets.slice(0, Math.min(4, density + 1)).map(x => `- ${x}`).join('\n')}`;

      const cleaned = this.cleanGeneratedDossier ? this.cleanGeneratedDossier(md) : md.replace(/\\n/g,'\n').replace(/\s+([.,;:])/g,'$1').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
      const score = this.scoreGeneratedDossier ? this.scoreGeneratedDossier(cleaned, { profile, pressure, nearbyArchetypes }) : cleaned.length;
      if (!best || score > best.score) best = { text: cleaned, score, pressure };
    }
    return best.text;
  }

  cleanGeneratedDossier(text) {
    return String(text || '')
      .replace(/\\n/g, '\n')
      .replace(/Generated premise:\s*/gi, '')
      .replace(/standard, tainted/gi, 'standard but tainted')
      .replace(/dense, tainted/gi, 'dense but tainted')
      .replace(/thin, tainted/gi, 'thin but tainted')
      .replace(/mainworld before the mainworld/gi, 'mainworld before the planet fills the screens')
      .replace(/mainworld authority,\s*standard,?\s*and/gi, 'local authority, routine services, and')
      .replace(/\bpeople who can erases\b/gi, 'office that can erase')
      .replace(/\bpeople who can ([a-z]+)s\b/gi, 'office that can $1')
      .replace(/\bis a ([a-z ]+) create the local order where\b/gi, 'is shaped by $1, while')
      .replace(/officials describe it as routine or dull[^.]*\./gi, 'Officials have a tidy explanation for it, which is exactly why it deserves a closer look.')
      .replace(/A local site where ([^.]+) turns into a playable scene\./gi, 'A practical local site where $1 creates obligations, arguments, and useful clues.')
      .replace(/\bthing\b/g, 'matter')
      .replace(/\s+([.,;:])/g, '$1')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  scoreGeneratedDossier(text, ctx = {}) {
    let score = 1000;
    const banned = [
      /Generated premise:/i,
      /\\n\d+\./,
      /mainworld before the mainworld/i,
      /with standard, tainted/i,
      /mainworld authority, standard/i,
      /tied to offworld contracts/i,
      /officials describe it as routine or dull/i,
      /a local site tied to/i,
      /turns into a playable scene/i,
      /people who can [a-z]+s/i,
      /is a .* create the local order/i,
      /environment can be lived in directly.*environment can be lived in directly/is
    ];
    for (const re of banned) if (re.test(text)) score -= 200;
    const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const starts = {};
    for (const line of lines) {
      const first = line.replace(/^[-\d.\s*]+/,'').split(/\s+/).slice(0,3).join(' ').toLowerCase();
      starts[first] = (starts[first] || 0) + 1;
    }
    for (const n of Object.values(starts)) if (n > 1) score -= 25 * (n - 1);
    const words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
    const generic = ['problem','thing','site','local','official','routine','leverage'];
    for (const g of generic) score -= Math.max(0, words.filter(w => w === g).length - 3) * 10;
    const sections = ['## First View from Orbit','## Surface Reality','## Government and Law','## Culture','## Locations','## Referee Secrets'];
    for (const s of sections) if (!text.includes(s)) score -= 150;
    if ((text.match(/\*\*/g) || []).length < 8) score -= 50;
    if (text.length < 1800) score -= 80;
    if (text.length > 5200) score -= 80;
    return score;
  }

  replaceGeneratedDossierBody(content) {
    const dossier = this.starterDossierSections();
    const firstHeading = /^## First View from Orbit\s*$/m;
    if (firstHeading.test(content)) return content.replace(/## First View from Orbit[\s\S]*$/m, dossier + '\n');
    return content.trimEnd() + '\n\n' + dossier + '\n';
  }

  async regenerateMainworldDossier() {
    const path = normalizePath(`${this.mainworldNotePathNoExt()}.md`);
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!file) { await this.createMainworldNote(true); return; }
    const original = await this.plugin.app.vault.read(file);
    const updated = this.replaceGeneratedDossierBody(original);
    await this.plugin.app.vault.modify(file, updated);
    if (this.plugin.app.fileManager?.processFrontMatter) {
      const p = this.dossierProfile();
      await this.plugin.app.fileManager.processFrontMatter(file, fm => {
        fm.dossier_engine_version = '4.1';
        fm.dossier_archetype = p.primary;
        fm.dossier_secondary_archetype = p.secondary;
        fm.dossier_premise = p.premise;
        fm.dossier_tone = p.tone;
        fm.dossier_pressure_sources = p.pressures;
        fm.dossier_context_tags = p.tags;
        fm.dossier_clean_body = true;
        fm.dossier_generator_architecture = 'archetype_pressure_microrealizer';
        fm.dossier_quality_mode = 'best_of_8_linted';
      });
    }
    await this.plugin.app.workspace.getLeaf(false).openFile(file);
    new Notice('Mainworld dossier regenerated with Dossier Engine v4.1 prose.');
  }

  mainworldNoteContent() { const body = this.plugin.settings.createNoteTemplate ? `
# ${this.state.name || 'Unnamed'}

## System
[[${this.systemIndexLinkTarget()}|${this.systemName()}]]

${this.starterDossierSections()}
` : ''; return `${this.getMainworldYaml()}
${body}`; }
  supportNoteContent(supportType, title) { return `${this.getSupportYaml(supportType, title)}\n\n# ${title}\n\n${this.supportBody(supportType, title)}\n`; }
  async ensureFolder(path) { if (!(await this.plugin.app.vault.adapter.exists(path))) await this.plugin.app.vault.createFolder(path); }
  frontmatterToState(fm) { const uwp = String(fm.mainworld_uwp || fm.uwp || 'C767645-8').toUpperCase(); const next = Object.assign({}, this.state); next.hex = String(fm.hex || fm.system_hex || next.hex || '0000').padStart(4,'0'); next.name = String(fm.mainworld || fm.name || fm.system_name || next.name || 'Unnamed').replace(/ System$/,''); if (/^[ABCDEX][0-9A-F]{6}-[0-9A-F]$/i.test(uwp)) { next.starport = uwp[0]; next.size = HEX.indexOf(uwp[1]); next.atm = HEX.indexOf(uwp[2]); next.hydro = HEX.indexOf(uwp[3]); next.pop = HEX.indexOf(uwp[4]); next.gov = HEX.indexOf(uwp[5]); next.law = HEX.indexOf(uwp[6]); next.tl = HEX.indexOf(uwp[8]); } next.allegiance = String(fm.allegiance || next.allegiance || 'Independent'); next.allegianceCode = String(fm.allegiance_code || deriveAllegianceCode(next.allegiance)); next.zone = String(fm.travel_zone || fm.zone || next.zone || 'Green'); next.prominence = String(fm.prominence || next.prominence || 'minor'); next.popMultiplier = clamp(fm.population_multiplier ?? next.popMultiplier,0,9); next.belts = clamp(fm.belts ?? next.belts,0,9); next.gasGiants = clamp(fm.gas_giants ?? (fm.gas_giant ? 1 : next.gasGiants),0,9); next.gasGiant = next.gasGiants > 0 || !!fm.gas_giant; next.pbg = String(fm.pbg || `${next.popMultiplier}${next.belts}${next.gasGiants}`); next.worldCount = clamp(fm.world_count ?? next.worldCount,1,99); next.stellar = String(fm.stellar || fm.primary_star || next.stellar || 'G2 V'); next.stars = Array.isArray(fm.stars) ? fm.stars : [next.stellar]; next.importance = clamp(fm.importance ?? next.importance,-9,9); next.routeRole = String(fm.route_role || next.routeRole || 'backwater'); next.refinedFuel = !!(fm.refined_fuel_available ?? next.refinedFuel); next.unrefinedFuel = !!(fm.unrefined_fuel_available ?? next.unrefinedFuel); next.wildernessRefuelling = !!(fm.wilderness_refuelling ?? next.wildernessRefuelling); next.fuelSources = this.normalizeArrayValue(fm.fuel_sources).length ? this.normalizeArrayValue(fm.fuel_sources) : next.fuelSources; next.starportLocation = String(fm.starport_location || next.starportLocation || 'mainworld'); next.downport = String(fm.mainworld_downport || next.downport || ''); next.starportFacilities = String(fm.starport_facilities || next.starportFacilities || 'standard'); next.xboatRoute = !!(fm.xboat_route ?? next.xboatRoute); next.tradeRoute = !!(fm.trade_route ?? next.tradeRoute); next.patrolRoute = !!(fm.patrol_route ?? next.patrolRoute); next.bases = new Set(this.normalizeArrayValue(fm.bases)); this.state = next; this.updateFuelFromSystem(); }
  async loadFileIntoWorkbench(file) {
    if (!this.pathLooksLikeMarkdownFile(file)) { new Notice('No markdown file to load.'); return; }
    const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const folderInfo = this.parseSystemFolderPath(file.path);
    if (!fm.hex && !fm.system_hex && !fm.mainworld_uwp && !fm.uwp && !folderInfo) { new Notice('This note does not look like a Traveller system/mainworld note.'); return; }
    const merged = Object.assign({}, fm);
    if (folderInfo) {
      merged.hex = merged.hex || merged.system_hex || folderInfo.hex;
      if (!merged.mainworld && !merged.name) merged.mainworld = folderInfo.name.replace(/^_/, '');
    }
    this.frontmatterToState(merged);
    const systemFile = this.findSystemIndexFileNear(file) || file;
    const systemFolder = this.folderFromPath(systemFile.path);
    this.state.loadedSystemFilePath = systemFile.path;
    this.state.loadedSystemFolder = systemFolder;
    this.state.loadedSystemHex = this.state.hex;
    this.updateOutputs();
    this.updateVaultStatus();
    new Notice(`Loaded ${file.basename}.`);
  }
  async loadActiveSystemNote() { const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView); const file = view?.file; await this.loadFileIntoWorkbench(file); }
  findSystemIndexFileNear(file) {
    if (!this.pathLooksLikeMarkdownFile(file)) return null;
    const folder = this.folderFromPath(file.path);
    const files = this.plugin.app.vault.getMarkdownFiles().filter(f => this.folderFromPath(f.path) === folder);
    const systemByFm = files.find(f => { const fm = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter || {}; return fm.type === 'system' || fm.record_type === 'system'; });
    if (systemByFm) return systemByFm;
    const underscore = files.find(f => f.basename.startsWith('_'));
    return underscore || null;
  }
  findSystemRecordByHex(hex) {
    const target = String(hex || '').padStart(4,'0');
    const records = this.getSystemRecords();
    return records.find(r => r.hex === target) || null;
  }
  async loadSystemByHex(hex) {
    const target = String(hex || '').padStart(4,'0');
    const record = this.findSystemRecordByHex(target);
    if (!record) { new Notice(`No system note found for hex ${target}. I scanned the whole vault; check that the system note has YAML with hex/system_hex or lives in a folder named '${target} - Name'.`); return; }
    await this.loadFileIntoWorkbench(record.file);
  }
  updateVaultStatus() {
    if (!this.controls.vaultStatus) return;
    const folder = this.systemFolderPath();
    const indexPath = this.systemIndexPath();
    const mainPath = `${this.mainworldNotePathNoExt()}.md`;
    const exists = p => !!this.plugin.app.vault.getAbstractFileByPath(normalizePath(p));
    const support = ['NPCs.md','Factions.md','Rumors.md','Ships and Traffic.md','Sessions.md'];
    const made = support.filter(n => exists(`${folder}/${n}`)).length;
    const source = this.shouldUseLoadedSystemFolder() ? 'loaded path' : 'settings path';
    this.controls.vaultStatus.setText(`Vault status (${source}): system ${exists(indexPath) ? 'exists' : 'not created'} · mainworld ${exists(mainPath) ? 'exists' : 'not created'} · support notes ${made}/5 · index ${indexPath}`);
  }
  async createSystemFolder() {
    this.state.loadedSystemFolder = '';
    this.state.loadedSystemFilePath = '';
    this.state.loadedSystemHex = '';
    const folder = this.systemFolderPath();
    await this.ensureFolder(normalizePath(this.plugin.settings.systemFolder || 'Systems'));
    await this.ensureFolder(folder);
    const indexPath = this.systemIndexPath();
    if (await this.plugin.app.vault.adapter.exists(indexPath)) { new Notice(`System already exists: ${indexPath}`); }
    else { await this.plugin.app.vault.create(indexPath, this.systemNoteContent()); }
    const indexFile = this.plugin.app.vault.getAbstractFileByPath(indexPath);
    if (this.pathLooksLikeMarkdownFile(indexFile)) {
      this.state.loadedSystemFilePath = indexFile.path;
      this.state.loadedSystemFolder = folder;
      this.state.loadedSystemHex = this.state.hex;
    }
    if (this.plugin.settings.createMainworldNote) await this.createMainworldNote(false);
    if (this.plugin.settings.createSupportNotes) await this.createSupportNotes(folder);
    const file = this.plugin.app.vault.getAbstractFileByPath(indexPath);
    if (this.pathLooksLikeMarkdownFile(file)) await this.plugin.app.workspace.getLeaf(false).openFile(file);
    this.updateVaultStatus();
    new Notice(`System folder ready: ${folder}`);
  }
  async createMainworldNote(showNotice = true) {
    const folder = this.systemFolderPath();
    await this.createMainworldNoteInFolder(folder, showNotice);
  }
  async createMainworldNoteInFolder(folder, showNotice = true) {
    const targetFolder = normalizePath(folder || this.systemFolderPath());
    await this.ensureFolder(targetFolder);
    const fileName = `${sanitizeFileName(this.state.name)}.md`;
    const path = normalizePath(`${targetFolder}/${fileName}`);
    if (await this.plugin.app.vault.adapter.exists(path)) { if (showNotice) new Notice(`Mainworld note already exists: ${path}`); return this.plugin.app.vault.getAbstractFileByPath(path); }
    const file = await this.plugin.app.vault.create(path, this.mainworldNoteContentForFolder(targetFolder));
    if (showNotice) { await this.plugin.app.workspace.getLeaf(false).openFile(file); this.updateVaultStatus(); new Notice(`Created ${fileName}.`); }
    return file;
  }
  mainworldNoteContentForFolder(folder) {
    const previousFolder = this.state.loadedSystemFolder;
    const previousFile = this.state.loadedSystemFilePath;
    const previousHex = this.state.loadedSystemHex;
    this.state.loadedSystemFolder = normalizePath(folder || previousFolder || '');
    if (!this.state.loadedSystemFilePath) this.state.loadedSystemFilePath = normalizePath(`${this.state.loadedSystemFolder}/${this.systemIndexFileName()}`);
    this.state.loadedSystemHex = this.state.hex;
    const content = this.mainworldNoteContent();
    this.state.loadedSystemFolder = previousFolder;
    this.state.loadedSystemFilePath = previousFile;
    this.state.loadedSystemHex = previousHex;
    return content;
  }
  async createSupportNotes(folder) { const notes = { 'NPCs.md': ['npcs','NPCs'], 'Factions.md': ['factions','Factions'], 'Rumors.md': ['rumors','Rumors'], 'Ships and Traffic.md': ['ships_traffic','Ships and Traffic'], 'Sessions.md': ['sessions','Sessions'] }; for (const [name, data] of Object.entries(notes)) { const path = normalizePath(`${folder}/${name}`); if (!(await this.plugin.app.vault.adapter.exists(path))) await this.plugin.app.vault.create(path, this.supportNoteContent(data[0], data[1])); } }
  resolveLoadedSystemFile() {
    const candidates = [];
    if (this.state.loadedSystemFilePath) candidates.push(this.state.loadedSystemFilePath);
    const active = this.plugin.app.workspace.getActiveFile?.();
    if (this.pathLooksLikeMarkdownFile(active)) candidates.push(active.path);
    for (const raw of candidates) {
      const file = this.plugin.app.vault.getAbstractFileByPath(normalizePath(raw));
      if (this.pathLooksLikeMarkdownFile(file)) {
        const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
        const folderInfo = this.parseSystemFolderPath(file.path);
        const isSystemish = fm.type === 'system' || fm.record_type === 'system' || file.basename.startsWith('_') || !!folderInfo;
        const hex = String(fm.hex || fm.system_hex || folderInfo?.hex || this.state.hex || '').padStart(4,'0');
        if (isSystemish && hex === String(this.state.hex || '').padStart(4,'0')) return file;
      }
    }
    const record = this.findSystemRecordByHex(this.state.hex);
    if (record?.file && this.pathLooksLikeMarkdownFile(record.file)) return record.file;
    return null;
  }
  async promoteSystem() {
    const loaded = this.resolveLoadedSystemFile();
    let folder = loaded ? this.folderFromPath(loaded.path) : this.systemFolderPath();
    if (loaded) {
      await this.loadFileIntoWorkbench(loaded);
      folder = this.folderFromPath(loaded.path);
    }
    folder = normalizePath(folder);
    await this.ensureFolder(folder);
    this.state.loadedSystemFolder = folder;
    this.state.loadedSystemHex = this.state.hex;
    this.state.prominence = 'important';
    this.plugin.settings.defaultStatus = 'playable';
    let indexPath = loaded?.path || normalizePath(`${folder}/${this.systemIndexFileName()}`);
    if (!(await this.plugin.app.vault.adapter.exists(indexPath))) {
      await this.plugin.app.vault.create(indexPath, this.systemNoteContent());
    }
    this.state.loadedSystemFilePath = indexPath;
    await this.createMainworldNoteInFolder(folder, false);
    await this.createSupportNotes(folder);
    const file = this.plugin.app.vault.getAbstractFileByPath(indexPath);
    if (!this.pathLooksLikeMarkdownFile(file)) {
      new Notice(`Promote failed: could not resolve system index note at ${indexPath}.`);
      return;
    }
    if (this.plugin.app.fileManager?.processFrontMatter) {
      await this.plugin.app.fileManager.processFrontMatter(file, fm => {
        fm.prep_status = 'playable'; fm.status = 'playable'; fm.prominence = 'important'; fm.last_promoted = new Date().toISOString().slice(0,10);
        fm.route_role = this.state.routeRole; fm.importance = this.state.importance;
        fm.system_folder = folder; fm.system_note = `[[${indexPath.replace(/\.md$/i,'')}|${this.systemName()}]]`;
        fm.mainworld_note = `[[${normalizePath(`${folder}/${sanitizeFileName(this.state.name)}`)}|${this.state.name || 'Unnamed'}]]`;
      });
    } else {
      new Notice('Promote warning: Obsidian frontmatter API was unavailable, so notes were created but system YAML was not updated.');
    }
    await this.plugin.app.workspace.getLeaf(false).openFile(file);
    this.updateVaultStatus();
    new Notice(`System promoted in ${folder}: missing notes created, existing notes preserved.`);
  }

  normalizeArrayValue(value) { if (Array.isArray(value)) return value; if (typeof value === 'string') return cleanList(value); return []; }
  getSystemFiles() {
    return this.plugin.app.vault.getMarkdownFiles().filter(file => {
      const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const folderInfo = this.parseSystemFolderPath(file.path);
      return fm.type === 'system' || fm.record_type === 'system' || (fm.hex && fm.mainworld_uwp && file.basename.startsWith('_')) || (!!folderInfo && file.basename.startsWith('_'));
    });
  }
  getSystemRecords() {
    return this.getSystemFiles().map(file => {
      const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const folderInfo = this.parseSystemFolderPath(file.path);
      const hex = String(fm.hex || fm.system_hex || folderInfo?.hex || '').padStart(4, '0');
      const name = String(fm.mainworld || fm.name || folderInfo?.name || file.basename || 'Unnamed').replace(/ System$/,'').replace(/^_/, '');
      return { file, path: file.path, folder: this.folderFromPath(file.path), hex, name, systemName: String(fm.system_name || fm.name || `${name} System`), uwp: String(fm.mainworld_uwp || fm.uwp || ''), allegiance: String(fm.allegiance || ''), allegianceCode: String(fm.allegiance_code || ''), zone: String(fm.travel_zone || fm.zone || 'Green'), routeRole: String(fm.route_role || ''), importance: Number(fm.importance || 0), bases: this.normalizeArrayValue(fm.bases), tradeCodes: this.normalizeArrayValue(fm.trade_codes), gasGiants: Number(fm.gas_giants || (fm.gas_giant ? 1 : 0)), belts: Number(fm.belts || 0), pbg: String(fm.pbg || ''), stellar: String(fm.stellar || fm.primary_star || ''), xboatRoute: !!fm.xboat_route, tradeRoute: !!fm.trade_route, patrolRoute: !!fm.patrol_route, prominence: String(fm.prominence || ''), status: String(fm.status || fm.prep_status || ''), dossier_archetype: String(fm.dossier_archetype || ''), archetype: String(fm.dossier_archetype || '') };
    }).filter(r => /^[0-9]{4}$/.test(r.hex));
  }
  sortRecords(records) { return Array.from(records).sort((a,b) => a.hex.localeCompare(b.hex) || a.name.localeCompare(b.name)); }
  systemWikiLink(record) { return `[[${record.path.replace(/\.md$/,'')}|${record.hex} ${record.name}]]`; }
  buildSubsectorIndexMarkdown(records = this.getSystemRecords()) { const sorted = this.sortRecords(records); const lines = ['---','type: subsector_index','record_type: subsector_index',`system_count: ${sorted.length}`,`updated: "${new Date().toISOString().slice(0,10)}"`,'tags: [traveller, traveller/subsector, index]','---','','# Subsector Index','','| Hex | System | UWP | Allegiance | Zone | Routes | Bases | Trade | PBG | Stellar |','|---|---|---|---|---|---|---|---|---|---|']; for (const r of sorted) { const routes = [r.xboatRoute ? 'XBoat' : '', r.tradeRoute ? 'Trade' : '', r.patrolRoute ? 'Patrol' : ''].filter(Boolean).join(', ') || '-'; lines.push(`| ${r.hex} | ${this.systemWikiLink(r)} | ${r.uwp || '-'} | ${r.allegiance || '-'} | ${r.zone || '-'} | ${routes} | ${r.bases.join(', ') || '-'} | ${r.tradeCodes.join(' ') || '-'} | ${r.pbg || '-'} | ${r.stellar || '-'} |`); } lines.push('', '## By Allegiance'); const allegiances = {}; for (const r of sorted) { const key = r.allegiance || 'Unknown'; (allegiances[key] ||= []).push(r); } for (const [key, items] of Object.entries(allegiances).sort()) lines.push(`- **${key}**: ${items.map(r => this.systemWikiLink(r)).join(', ')}`); lines.push('', '## Amber / Red Zones'); for (const r of sorted.filter(r => ['Amber','Red'].includes(r.zone))) lines.push(`- ${this.systemWikiLink(r)} — ${r.zone}`); lines.push('', '## Route Systems'); for (const r of sorted.filter(r => r.xboatRoute || r.tradeRoute || r.patrolRoute)) lines.push(`- ${this.systemWikiLink(r)} — ${[r.xboatRoute?'XBoat':'', r.tradeRoute?'Trade':'', r.patrolRoute?'Patrol':''].filter(Boolean).join(', ')}`); return lines.join('\n'); }
  showSubsectorIndex() { const md = this.buildSubsectorIndexMarkdown(); if (this.controls.subsectorOutput) this.controls.subsectorOutput.value = md; new Notice('Subsector index generated in output box.'); }
  async createOrReplaceFile(path, content) { const normalized = normalizePath(path); const file = this.plugin.app.vault.getAbstractFileByPath(normalized); if (file) await this.plugin.app.vault.modify(file, content); else await this.plugin.app.vault.create(normalized, content); return this.plugin.app.vault.getAbstractFileByPath(normalized); }
  async createSubsectorIndexNote() { await this.ensureFolder(normalizePath(this.plugin.settings.systemFolder || 'Systems')); const path = normalizePath(`${this.plugin.settings.systemFolder || 'Systems'}/_Subsector Index.md`); const file = await this.createOrReplaceFile(path, this.buildSubsectorIndexMarkdown()); if (file) await this.plugin.app.workspace.getLeaf(false).openFile(file); new Notice('Subsector index note created/updated.'); }
  recordsWithinJump(record, records, jump) { return this.sortRecords(records.filter(other => other.hex !== record.hex && hexDistance(parseHex(record.hex), parseHex(other.hex)) <= jump)); }
  async writeNeighborBacklinksForAll() { const records = this.getSystemRecords(); let updated = 0; for (const r of records) { const file = this.plugin.app.vault.getAbstractFileByPath(r.path); if (!file || !this.plugin.app.fileManager?.processFrontMatter) continue; const j1 = this.recordsWithinJump(r, records, 1).map(x => this.systemWikiLink(x)); const j2 = this.recordsWithinJump(r, records, 2).map(x => this.systemWikiLink(x)); const j3 = this.recordsWithinJump(r, records, 3).map(x => this.systemWikiLink(x)); await this.plugin.app.fileManager.processFrontMatter(file, fm => { fm.jump_1_systems = j1; fm.jump_2_systems = j2; fm.jump_3_systems = j3; fm.jump_1_count = j1.length; fm.jump_2_count = j2.length; fm.jump_3_count = j3.length; fm.neighbor_backlinks_updated = new Date().toISOString().slice(0,10); }); updated++; } new Notice(`Neighbor backlinks written for ${updated} systems.`); }
  secLineToState(line) { const parts = String(line || '').trim().split(/\s+/); const hex = parts.shift(); const uwpIndex = parts.findIndex(t => /^[ABCDEX][0-9A-F]{6}-[0-9A-F]$/i.test(t)); if (!hex || uwpIndex < 1) return null; const name = titleCaseName(parts.slice(0, uwpIndex).join(' ')); const uwp = parts[uwpIndex].toUpperCase(); let rest = parts.slice(uwpIndex + 1); const baseToken = rest.shift() || '-'; const bases = new Set(); Object.entries(BASE_CODES).forEach(([base, code]) => { if (baseToken.includes(code)) bases.add(base); }); const zoneAt = rest.findIndex(t => ['-','A','R','Green','Amber','Red'].includes(t)); const remarks = zoneAt >= 0 ? rest.slice(0, zoneAt).filter(t => t !== '-') : []; let zone = 'Green'; if (zoneAt >= 0) { const z = rest[zoneAt]; zone = z === 'A' ? 'Amber' : z === 'R' ? 'Red' : z === '-' ? 'Green' : z; rest = rest.slice(zoneAt + 1); } let pbg = '000', popMultiplier = 0, belts = 0, gasGiants = 0; if (rest[0] && /^[0-9]{3}$/.test(rest[0])) { pbg = rest.shift(); popMultiplier = parseInt(pbg[0],10); belts = parseInt(pbg[1],10); gasGiants = parseInt(pbg[2],10); } const allegianceCode = rest[0] || deriveAllegianceCode(this.state.allegiance); if (rest[0]) rest.shift(); const stellar = rest.join(' ') || rollStellar(); return { hex, name, starport: uwp[0], size: HEX.indexOf(uwp[1]), atm: HEX.indexOf(uwp[2]), hydro: HEX.indexOf(uwp[3]), pop: HEX.indexOf(uwp[4]), gov: HEX.indexOf(uwp[5]), law: HEX.indexOf(uwp[6]), tl: HEX.indexOf(uwp[8]), bases, zone, pbg, popMultiplier, belts, gasGiants, gasGiant: gasGiants > 0, allegianceCode, stellar, stars: [stellar] }; }
  async importBulkSec(text) { const lines = String(text || '').split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith('#') && !x.startsWith('//')); if (!lines.length) { new Notice('Paste .SEC-style lines first.'); return; } const original = Object.assign({}, this.state, { bases: new Set(this.state.bases) }); let created = 0, skipped = 0; for (const line of lines) { const parsed = this.secLineToState(line); if (!parsed) { skipped++; continue; } Object.assign(this.state, parsed); this.updateFuelFromSystem(); this.state.allegiance = this.state.allegiance || this.plugin.settings.defaultAllegiance || 'Independent'; const folder = this.systemFolderPath(); await this.ensureFolder(normalizePath(this.plugin.settings.systemFolder || 'Systems')); await this.ensureFolder(folder); const indexPath = this.systemIndexPath(); if (!(await this.plugin.app.vault.adapter.exists(indexPath))) { await this.plugin.app.vault.create(indexPath, this.systemNoteContent()); created++; } else skipped++; } this.state = original; this.updateOutputs(); new Notice(`Bulk import complete: ${created} created, ${skipped} skipped/unparsed.`); }
  async createRouteCanvas() { const records = this.sortRecords(this.getSystemRecords()); const nodes = []; const edges = []; const idByHex = {}; for (const r of records) { const { col, row } = parseHex(r.hex); const id = `system-${r.hex}`; idByHex[r.hex] = id; nodes.push({ id, type: 'text', x: col * 260, y: row * 170 + (col % 2 ? 85 : 0), width: 220, height: 110, text: `${r.hex} ${r.name}\n${r.uwp || ''}\n${r.allegiance || ''} ${r.zone || ''}` }); } let edgeId = 1; for (const a of records) for (const b of records) { if (a.hex >= b.hex) continue; const d = hexDistance(parseHex(a.hex), parseHex(b.hex)); if (d === 1 && (a.xboatRoute || a.tradeRoute || a.patrolRoute || b.xboatRoute || b.tradeRoute || b.patrolRoute)) edges.push({ id: `edge-${edgeId++}`, fromNode: idByHex[a.hex], fromSide: 'right', toNode: idByHex[b.hex], toSide: 'left' }); } const canvas = { nodes, edges }; await this.ensureFolder(normalizePath(this.plugin.settings.systemFolder || 'Systems')); const path = normalizePath(`${this.plugin.settings.systemFolder || 'Systems'}/_Route Visualizer.canvas`); await this.createOrReplaceFile(path, JSON.stringify(canvas, null, 2)); new Notice('Route canvas created/updated.'); }
  buildDossierPrompt() { return `Create a deep Traveller referee dossier for this system. Use the metadata as hard constraints and expand creatively without contradicting it.\n\nSystem: ${this.systemName()}\nHex: ${this.state.hex}\nMainworld: ${this.state.name}\nUWP: ${this.getUwp()}\nMap line: ${this.getMapLine()}\nAllegiance: ${this.state.allegiance} (${this.state.allegianceCode})\nTravel zone: ${this.state.zone}\nBases: ${Array.from(this.state.bases).join(', ') || 'None'}\nTrade codes: ${this.getTradeCodes().join(', ') || 'None'}\nPBG: ${this.state.pbg}\nWorld count: ${this.state.worldCount}\nStellar: ${this.state.stellar}\nFuel: refined=${this.state.refinedFuel}, unrefined=${this.state.unrefinedFuel}, wilderness=${this.state.wildernessRefuelling}; sources=${(this.state.fuelSources || []).join(', ')}\nRoutes: xboat=${this.state.xboatRoute}, trade=${this.state.tradeRoute}, patrol=${this.state.patrolRoute}; role=${this.state.routeRole}\nImportance: ${this.state.importance}; prominence=${this.state.prominence}\n\nOutput sections:\n1. System overview\n2. Mainworld profile\n3. Starport and traffic\n4. Other worlds, moons, belts, and gas giants\n5. Factions and power structure\n6. Culture and daily life\n7. Current tensions\n8. 6 named locations\n9. 6 NPCs\n10. 6 rumors, with truth values\n11. 6 adventure hooks\n12. Referee secrets\n13. How this system connects to nearby systems and routes\n\nKeep it playable, specific, and full of details a referee can use at the table.`; }
  async createDossierPromptNote() { const folder = this.systemFolderPath(); await this.ensureFolder(normalizePath(this.plugin.settings.systemFolder || 'Systems')); await this.ensureFolder(folder); const path = normalizePath(`${folder}/Dossier Prompt.md`); const content = `---\ntype: prompt\nrecord_type: worldbuilding_prompt\nsystem_hex: "${yamlString(this.state.hex)}"\nsystem: "${yamlString(this.systemName())}"\nmainworld: "${yamlString(this.state.name)}"\nuwp: "${this.getUwp()}"\ntags: [traveller, traveller/prompt, worldbuilding]\n---\n\n# Dossier Prompt — ${this.systemName()}\n\n\`\`\`text\n${this.buildDossierPrompt()}\n\`\`\`\n`; const file = await this.createOrReplaceFile(path, content); if (file) await this.plugin.app.workspace.getLeaf(false).openFile(file); new Notice('Dossier prompt note created/updated.'); }
  async validateSystems() { const records = this.getSystemRecords(); const issues = []; const byHex = {}; for (const r of records) (byHex[r.hex] ||= []).push(r); for (const [hex, items] of Object.entries(byHex)) if (items.length > 1) issues.push(`Duplicate hex ${hex}: ${items.map(x => x.path).join(', ')}`); for (const r of records) { if (!/^[0-9]{4}$/.test(r.hex)) issues.push(`${r.path}: malformed hex '${r.hex}'`); if (r.uwp && !/^[ABCDEX][0-9A-F]{6}-[0-9A-F]$/i.test(r.uwp)) issues.push(`${r.path}: malformed UWP '${r.uwp}'`); if (!r.uwp) issues.push(`${r.path}: missing mainworld_uwp/uwp`); if (!r.pbg || !/^[0-9]{3}$/.test(r.pbg)) issues.push(`${r.path}: missing or malformed PBG '${r.pbg}'`); if (!r.stellar) issues.push(`${r.path}: missing stellar data`); if (!r.allegiance) issues.push(`${r.path}: missing allegiance`); if (!['Green','Amber','Red'].includes(r.zone)) issues.push(`${r.path}: travel_zone should be Green, Amber, or Red`); if (r.gasGiants > 0 && r.pbg && /^[0-9]{3}$/.test(r.pbg) && Number(r.pbg[2]) !== r.gasGiants) issues.push(`${r.path}: gas_giants does not match PBG third digit`); } const report = ['---','type: validation_report','record_type: validation_report',`system_count: ${records.length}`,`issue_count: ${issues.length}`,`updated: "${new Date().toISOString().slice(0,10)}"`,'tags: [traveller, traveller/validation, report]','---','','# Traveller System Validation Report','', issues.length ? issues.map(i => `- ${i}`).join('\n') : 'No issues found.'].join('\n'); if (this.controls.subsectorOutput) this.controls.subsectorOutput.value = report; await this.ensureFolder(normalizePath(this.plugin.settings.systemFolder || 'Systems')); const file = await this.createOrReplaceFile(normalizePath(`${this.plugin.settings.systemFolder || 'Systems'}/_Validation Report.md`), report); if (file) await this.plugin.app.workspace.getLeaf(false).openFile(file); new Notice(`Validation complete: ${issues.length} issue(s).`); }
  async insertYamlIntoActiveNote() { const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView); if (!view) { new Notice('No active Markdown note.'); return; } view.editor.replaceSelection(this.getYaml() + '\n'); new Notice('Inserted system YAML into active note.'); }
}

class TravellerToolkitSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; containerEl.empty(); containerEl.createEl('h2', { text: 'Traveller Toolkit Settings' });
    new Setting(containerEl).setName('System folder').setDesc('Base folder where system folders are created.').addText(text => text.setPlaceholder('Systems').setValue(this.plugin.settings.systemFolder || 'Systems').onChange(async value => { this.plugin.settings.systemFolder = value || 'Systems'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('System index filename').setDesc('Filename for each system index note.').addText(text => text.setPlaceholder('_{name}.md').setValue(this.plugin.settings.systemIndexFile || '_{name}.md').onChange(async value => { this.plugin.settings.systemIndexFile = value || '_{name}.md'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Create mainworld note with system').setDesc('When creating a system folder, also create Name.md for the mainworld.').addToggle(toggle => toggle.setValue(!!this.plugin.settings.createMainworldNote).onChange(async value => { this.plugin.settings.createMainworldNote = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Create support notes with system').setDesc('Also create NPCs, Factions, Rumors, Ships and Traffic, and Sessions notes with strong YAML.').addToggle(toggle => toggle.setValue(!!this.plugin.settings.createSupportNotes).onChange(async value => { this.plugin.settings.createSupportNotes = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Default allegiance').setDesc('Used when the toolkit view opens.').addText(text => text.setValue(this.plugin.settings.defaultAllegiance).onChange(async value => { this.plugin.settings.defaultAllegiance = value || 'Independent'; this.plugin.settings.defaultAllegianceCode = deriveAllegianceCode(this.plugin.settings.defaultAllegiance); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Allegiance list').setDesc('One allegiance per line.').addTextArea(text => text.setValue(this.plugin.settings.allegianceList).onChange(async value => { this.plugin.settings.allegianceList = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Default name seed').setDesc('Used by the name generator.').addText(text => text.setValue(this.plugin.settings.defaultNameSeed).onChange(async value => { this.plugin.settings.defaultNameSeed = value || 'Ardress'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Default status').setDesc('YAML status value for new notes.').addText(text => text.setValue(this.plugin.settings.defaultStatus).onChange(async value => { this.plugin.settings.defaultStatus = value || 'stub'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Default prominence').setDesc('YAML prominence value for new systems.').addText(text => text.setValue(this.plugin.settings.defaultProminence || 'minor').onChange(async value => { this.plugin.settings.defaultProminence = value || 'minor'; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Subsector columns').setDesc('Used for Jump-1/Jump-2 hex calculations.').addText(text => text.setValue(String(this.plugin.settings.subsectorColumns || 10)).onChange(async value => { this.plugin.settings.subsectorColumns = clamp(value,1,99); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Subsector rows').setDesc('Used for Jump-1/Jump-2 hex calculations.').addText(text => text.setValue(String(this.plugin.settings.subsectorRows || 16)).onChange(async value => { this.plugin.settings.subsectorRows = clamp(value,1,99); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Include note template').setDesc('Add starter sections after YAML when creating notes.').addToggle(toggle => toggle.setValue(this.plugin.settings.createNoteTemplate).onChange(async value => { this.plugin.settings.createNoteTemplate = value; await this.plugin.saveSettings(); }));
  }
}

module.exports = TravellerToolkitPlugin;
