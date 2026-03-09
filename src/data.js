// ─── Shared data & constants ──────────────────────────────────────────────────
// All months from Jan 2026 through Dec 2029 (48 months)
export const ALL_MONTHS = [];
for (let y = 2026; y <= 2029; y++)
  for (let m = 0; m < 12; m++)
    ALL_MONTHS.push(`${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]} ${String(y).slice(2)}`);

export const TODAY_IDX = (() => {
  const n = new Date();
  return Math.max(0, (n.getFullYear() - 2026) * 12 + n.getMonth());
})();

export const RAG = {
  G: { label:"On Track",   color:"#16a34a", bg:"#f0fdf4", light:"#dcfce7", border:"#bbf7d0", text:"#15803d" },
  A: { label:"At Risk",    color:"#d97706", bg:"#fffbeb", light:"#fef3c7", border:"#fde68a", text:"#92400e" },
  R: { label:"In Trouble", color:"#dc2626", bg:"#fef2f2", light:"#fee2e2", border:"#fecaca", text:"#991b1b" },
};

export const PALETTE = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#6366f1","#f97316","#64748b"];

export const ZOOM_LEVELS = [
  { label:"2 Yrs", months:24, col:44 },
  { label:"3 Yrs", months:36, col:36 },
  { label:"4 Yrs", months:48, col:28 },
];

let _uid = 1000;
export const uid = () => `x${_uid++}`;

export const ragWorst = rags => rags.includes("R") ? "R" : rags.includes("A") ? "A" : "G";

// ─── Policy summaries (from White Paper) ─────────────────────────────────────
export const POLICY_SUMMARIES = {
  "p1":  "Best Start Family Hubs revitalise the Sure Start model, creating a single community access point integrating health visiting, family support, and early education. Every hub will have a dedicated SEND practitioner. Backed by £200m+ over three years, this is the government's flagship early years place-based intervention.",
  "p2":  "A fundamental review of childcare and early education to improve access and coherence for families. Includes expansion of school-based nurseries and links to the 30 hours funded childcare expansion. The review aims to simplify the system and deliver a coherent local offer across all communities.",
  "p3":  "Expands early family help and integrates it with school attendance support. Severely absent children will be automatically assessed for Family Help. Part of the wider £2bn+ children's social care investment, this programme embeds a whole-family approach at the heart of school improvement.",
  "p4":  "Expanding Mental Health Support Teams from coverage of 60% to 100% of schools and colleges by end of Parliament. A cross-government delivery challenge requiring DfE, DHSC and NHS alignment. One of the most visible commitments in the White Paper for families.",
  "p5":  "A cross-government strategy to lift 500,000+ children out of poverty. Key measures include removing the two-child limit and expanding Free School Meals eligibility. This represents a major fiscal commitment and directly addresses the attainment gap driven by material deprivation.",
  "p6":  "A new model of shared accountability binding local authorities, schools, trusts, ICBs and police around common children's outcomes. Represents significant structural reform requiring new legislation and a fundamental shift in how the system operates locally.",
  "p7":  "Full implementation of the Curriculum and Assessment Review, with first teaching of new programmes of study from 2028 and updated GCSEs from 2029. Includes a digital navigable curriculum, embedding of oracy, financial, digital and media literacy, and compulsory citizenship in primary. Led by Becky Francis.",
  "p8":  "National Year of Reading 2026 anchors the government's literacy strategy. Includes doubling of the Reading Ambition CPD offer, launching Unlocking Reading secondary CPD, and the new statutory Year 8 reading test. Target: 75% of secondary literacy leads trained by end of 25/26.",
  "p9":  "New primary oracy framework combined with a secondary oracy, reading and writing framework. Speaking is elevated as a core foundation alongside reading and numeracy. Frameworks to be piloted and launched through 2026–27, with Ofsted updating its toolkit accordingly.",
  "p10": "A consultation on reforming Progress 8 to ensure English, Maths, two Sciences, a breadth element and a choice element sit at its core. Aims to support a strong academic core while giving creative subjects genuine parity. Running alongside the White Paper.",
  "p11": "Publishing an Enrichment Framework with benchmarks across civic, arts, nature, sport and life skills. Ofsted toolkits updated September 2026. Backed by £22.5m for 400 schools in deprived areas, with school profiles to include enrichment data. Joint delivery with DCMS.",
  "p12": "£24m programme delivering extracurricular technology education to 1 million secondary children across the UK. Joint DfE/DSIT flagship initiative. Aims to build digital skills and interest in technology careers from early secondary.",
  "p13": "Updated Gatsby Benchmarks with a commitment to two weeks of work experience in secondary. Career hubs expanded to work with Strategic Authorities. Enterprise and entrepreneurship embedded across the curriculum. Links directly to the forthcoming Post-16 White Paper.",
  "p14": "A fundamental reform of disadvantage funding, moving away from binary FSM to a model using income data reflecting depth and duration of disadvantage. Consultation planned for Summer 2026. Potential major rebalancing of the £8bn+ Pupil Premium and National Funding Formula.",
  "p15": "£1.6bn over three years (£500m+ per year) direct to mainstream schools as the Inclusive Mainstream Fund. Schools gain direct responsibility over inclusion funding and must publish an Inclusion Strategy. This is the central financial mechanism of the SEND reform programme.",
  "p16": "A new £1.8bn service over three years: £1bn for speech and language therapists, educational psychologists and professionals embedded in mainstream schools; £800m for specialist and AP outreach. Target: 40 days per primary school, 160 days per secondary school by 2028/29.",
  "p17": "£200m+ over three years for a landmark SEND CPD programme for all school staff nationwide from September 2026. Includes updated Initial Teacher Training and ECF, reviewed NPQs, and doubling of EYITT places by 2028.",
  "p18": "A new statutory duty requiring all schools to create individual, digital, interactive Support Plans for any child with identified SEND. Subject to annual review minimum and Ofsted assessment. Transition from EHCPs happens through 2029–30 for complex needs.",
  "p19": "£15m to build an evidence base and establish national inclusion standards through an independent expert panel. Includes a digital library of identification tools and provision to guide schools by 2028. Covers all layers of the SEND support pyramid.",
  "p20": "£40m+ over three years to address long-standing workforce shortages: 200+ additional Educational Psychologists per year from 2026, expanded SLT apprenticeships, and local SLT advanced practitioners in every ICB area.",
  "p21": "£3.7bn capital investment to 2030 for accessible buildings, new special school places, and 50,000+ inclusion base places. An additional £740m in 2025/26 alone for 10,000 places. Every secondary school to have an inclusion base over time.",
  "p22": "A London Challenge-inspired place-based mission to radically improve outcomes for white working-class children in the North East, including Wearside, Tees Valley and North Tyneside. Builds cluster schools, partnership boards, and a test-learn-grow improvement model.",
  "p23": "Targeting 94%+ attendance by 2028/29 — a 1.3pp improvement equating to 20 million more days in school per year. Backed by RISE Attendance and Behaviour Hubs covering 90 hub schools, 3,000+ schools per year and 500 intensive cases. AI-powered benchmarking reports for all schools.",
  "p24": "£15m expansion of attendance mentoring reaching 10,000 more persistently absent children with 1:1 trained mentors across 10 additional areas. Independent evaluation with the Youth Endowment Fund embedded from the start.",
  "p25": "Refreshed Behaviour in Schools guidance alongside updated Suspension and Permanent Exclusion guidance. New evidence-based teacher toolkit on behaviour and bullying. Emphasis throughout on inclusive approaches and restorative practice.",
  "p26": "Consultation on new powers allowing schools to suspend pupils on-site in a supervised environment rather than sending home. Alongside a new duty to set schoolwork for excluded children. Requires legislation. Currently Amber/Red risk given legislative timeline.",
  "p27": "Formal post-suspension meetings with agreed plans and shared responsibilities. Consultation on the model planned for 2026/27 alongside updated Suspension guidance. Backed by good practice resources developed with the sector.",
  "p28": "Bringing Ofsted, attainment, progress, attendance and enrichment data into one accessible school profile. Piloting this year, national launch next year. Under consideration for extension to 16–19 providers.",
  "p29": "Published alongside the White Paper: a plan to attract, retain and develop 6,500 more teachers with a focus on shortage subjects, secondary, special and FE. 2,300+ already recruited; STEM ITT target met for the first time. Three-phase delivery plan through to end of Parliament.",
  "p30": "Reforming statutory pay and conditions to remove the pay ceiling and continuing to accept STRB recommendations. Builds on ~10% pay increase over the last two years. Aims to make teaching a genuinely competitive profession in the labour market.",
  "p31": "New and improved training entitlement ensuring every teacher and leader accesses high-quality, career-long CPD. NPQs under review; ECT Entitlement to be reviewed from 2027. Designed to make professional development a genuine expectation rather than aspiration.",
  "p32": "New programme launching Autumn 2026 providing peer support, coaching and flexible working best practice to retain experienced teachers. Builds on the existing flexible working programme. Focus on protecting teaching time and reducing unnecessary workload.",
  "p33": "New mentoring and coaching offer for headteachers alongside a pilot of place-based Headteacher Retention Incentives. Focus on schools in disadvantaged communities where leadership recruitment and retention is most challenging.",
  "p34": "The most significant structural reform in the White Paper: a move to all schools being part of school trusts, with new trusts able to be established by local authorities or Area Partnerships. Requires primary legislation. Rooted in community accountability.",
  "p35": "A new proportionate, independent Ofsted inspection framework for trust quality, with targeted intervention where needed. Represents a fundamental shift from school-level to trust-level accountability. Framework under development for consultation.",
  "p36": "Clearer statutory roles for local authorities in relation to all local schools and health partners. Links directly to the devolution agenda and MHCLG. Aims to resolve long-standing ambiguities about LA responsibilities in a mixed trust/maintained landscape.",
  "p37": "Rolling out universal, targeted and specialist RISE support programmes including Attendance and Behaviour Hubs, Reception Networks, KS3 Alliance, and English and Maths Hub partnerships. The mechanism through which the self-improving school system is operationalised.",
  "p38": "Developing safe AI tools for teaching and learning, expanding Oak National Academy's Aila platform, and running an extensive evidence programme. Linked to the digital literacy curriculum strand. Goal: amplify teacher impact and meaningfully reduce workload.",
  "p39": "A more nuanced accountability system integrating school profiles, broader data for leaders, Ofsted grading of inclusion, and Progress 8 reform. Designed to reward inclusive practice and move beyond narrow exam-performance metrics.",
  "p40": "A single, easy-to-use online home for all school guidance — shorter, clearer and easier to navigate. One of the most consistently requested improvements from the sector. Aim: reduce the bureaucratic burden on school leaders.",
};

// ─── Initial data ─────────────────────────────────────────────────────────────
export const INITIAL_THEMES = [
  { id:"th1", color:"#0ea5e9", name:"Our Children's Futures", subtitle:"Wrapping Services Around Children & Families", rag:"G", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p1",  name:"Best Start Family Hubs & Healthy Babies", owner:"", rag:"G", notes:"", status:"", funding:"£200m+ over 3 years for SEND practitioners in hubs", deliverables:"Revitalise Sure Start model; single access point for health, family support & early education; dedicated SEND practitioner in every hub", collapsed:false,
        phases:[{id:"ph1",name:"Design & Spec",start:0,duration:3,rag:"G",color:"#0ea5e9",notes:""},{id:"ph2",name:"Rollout",start:3,duration:9,rag:"G",color:"#38bdf8",notes:""}] },
      { id:"p2",  name:"Childcare & Early Education Review", owner:"", rag:"A", notes:"", status:"", funding:"Links to 30hrs funded childcare expansion", deliverables:"Improve access, simplify system; expand school-based nurseries", collapsed:false,
        phases:[{id:"ph3",name:"Review",start:0,duration:4,rag:"A",color:"#0ea5e9",notes:""},{id:"ph4",name:"Consultation",start:4,duration:3,rag:"A",color:"#38bdf8",notes:""},{id:"ph5",name:"Implementation",start:7,duration:8,rag:"G",color:"#0284c7",notes:""}] },
      { id:"p3",  name:"Families First Partnership Programme", owner:"", rag:"G", notes:"", status:"", funding:"Part of £2bn+ children's social care investment", deliverables:"Expand early family help; integrate with school attendance support; Family Help for severely absent children", collapsed:false,
        phases:[{id:"ph6",name:"Pilot",start:0,duration:4,rag:"G",color:"#0ea5e9",notes:""},{id:"ph7",name:"Scale",start:4,duration:8,rag:"G",color:"#38bdf8",notes:""}] },
      { id:"p4",  name:"Mental Health Support Teams (MHSTs)", owner:"", rag:"A", notes:"", status:"", funding:"Cross-government delivery", deliverables:"Expand from 60% to 100% of schools & colleges by end of Parliament", collapsed:false,
        phases:[{id:"ph8",name:"Wave 1",start:0,duration:6,rag:"A",color:"#0ea5e9",notes:""},{id:"ph9",name:"Wave 2",start:6,duration:8,rag:"A",color:"#38bdf8",notes:""},{id:"ph10",name:"Full Coverage",start:14,duration:6,rag:"G",color:"#0284c7",notes:""}] },
      { id:"p5",  name:"Child Poverty Strategy", owner:"", rag:"A", notes:"", status:"", funding:"Major fiscal commitment across government", deliverables:"Lift 500k+ children out of poverty; remove two child limit; expand FSM eligibility", collapsed:false,
        phases:[{id:"ph11",name:"Strategy",start:0,duration:4,rag:"A",color:"#0ea5e9",notes:""},{id:"ph12",name:"Legislation",start:4,duration:8,rag:"A",color:"#38bdf8",notes:""},{id:"ph13",name:"Delivery",start:12,duration:8,rag:"G",color:"#0284c7",notes:""}] },
      { id:"p6",  name:"Local Partnership & Shared Accountability", owner:"", rag:"A", notes:"", status:"", funding:"Significant structural reform requiring cross-govt alignment", deliverables:"New model binding LAs, schools, trusts, ICBs, police around shared children's outcomes", collapsed:false,
        phases:[{id:"ph14",name:"Design",start:4,duration:5,rag:"A",color:"#0ea5e9",notes:""},{id:"ph15",name:"Pilot",start:9,duration:6,rag:"A",color:"#38bdf8",notes:""}] },
    ]
  },
  { id:"th2", color:"#7c3aed", name:"Narrow to Broad", subtitle:"Curriculum, Enrichment & Standards", rag:"G", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p7",  name:"Curriculum & Assessment Review", owner:"", rag:"G", notes:"", status:"", funding:"Knowledge-rich, coherent, subject mastery", deliverables:"Refresh programmes of study (first teaching 2028); update GCSEs (first teaching 2029); digital navigable curriculum; oracy, financial, digital & media literacy", collapsed:false,
        phases:[{id:"ph16",name:"Consultation",start:0,duration:4,rag:"G",color:"#7c3aed",notes:""},{id:"ph17",name:"Drafting",start:4,duration:8,rag:"G",color:"#a78bfa",notes:""},{id:"ph18",name:"First Teaching",start:24,duration:12,rag:"G",color:"#5b21b6",notes:""}] },
      { id:"p8",  name:"National Year of Reading 2026", owner:"", rag:"G", notes:"", status:"", funding:"New statutory Year 8 reading test", deliverables:"Double Reading CPD; Unlocking Reading secondary CPD; 75% secondary literacy leads trained by end 25/26", collapsed:false,
        phases:[{id:"ph19",name:"Launch",start:0,duration:2,rag:"G",color:"#7c3aed",notes:""},{id:"ph20",name:"Delivery",start:2,duration:8,rag:"G",color:"#a78bfa",notes:""},{id:"ph21",name:"Evaluate",start:10,duration:4,rag:"G",color:"#5b21b6",notes:""}] },
      { id:"p9",  name:"Oracy & Writing Frameworks", owner:"", rag:"G", notes:"", status:"", funding:"Speaking as core foundation alongside reading & numeracy", deliverables:"New primary oracy framework; combined secondary oracy, reading & writing framework; implementation", collapsed:false,
        phases:[{id:"ph22",name:"Design",start:2,duration:4,rag:"G",color:"#7c3aed",notes:""},{id:"ph23",name:"Pilot",start:6,duration:4,rag:"G",color:"#a78bfa",notes:""},{id:"ph24",name:"Launch",start:10,duration:6,rag:"G",color:"#5b21b6",notes:""}] },
      { id:"p10", name:"Progress 8 Reform", owner:"", rag:"A", notes:"", status:"", funding:"Consultation alongside White Paper", deliverables:"Consult on improved P8: English + Maths + 2 Science + Breadth + Choice; support strong academic core with creative parity", collapsed:false,
        phases:[{id:"ph25",name:"Consultation",start:0,duration:5,rag:"A",color:"#7c3aed",notes:""},{id:"ph26",name:"Analysis",start:5,duration:4,rag:"A",color:"#a78bfa",notes:""},{id:"ph27",name:"Reform",start:9,duration:6,rag:"G",color:"#5b21b6",notes:""}] },
      { id:"p11", name:"Enrichment Framework & Entitlement", owner:"", rag:"G", notes:"", status:"", funding:"£22.5m for 400 schools in deprived areas", deliverables:"Publish Enrichment Framework; set benchmarks (civic, arts, nature, sport, life skills); Ofsted toolkits updated Sept 2026", collapsed:false,
        phases:[{id:"ph28",name:"Framework",start:0,duration:4,rag:"G",color:"#7c3aed",notes:""},{id:"ph29",name:"Launch",start:4,duration:4,rag:"G",color:"#a78bfa",notes:""},{id:"ph30",name:"Embed",start:8,duration:8,rag:"G",color:"#5b21b6",notes:""}] },
      { id:"p12", name:"TechYouth Programme", owner:"", rag:"G", notes:"", status:"", funding:"£24m — 1m secondary children across UK", deliverables:"Extracurricular technology education to 1m secondary children across UK", collapsed:false,
        phases:[{id:"ph31",name:"Launch",start:0,duration:5,rag:"G",color:"#7c3aed",notes:""},{id:"ph32",name:"Scale",start:5,duration:10,rag:"G",color:"#a78bfa",notes:""}] },
      { id:"p13", name:"Careers & Work Experience", owner:"", rag:"G", notes:"", status:"", funding:"Links to Post-16 White Paper", deliverables:"Updated Gatsby Benchmarks; 2 weeks work experience; career hubs with Strategic Authorities", collapsed:false,
        phases:[{id:"ph33",name:"Guidance Update",start:0,duration:4,rag:"G",color:"#7c3aed",notes:""},{id:"ph34",name:"Implementation",start:4,duration:12,rag:"G",color:"#a78bfa",notes:""}] },
    ]
  },
  { id:"th3", color:"#059669", name:"Sidelined to Included", subtitle:"Disadvantage, SEND & Inclusion", rag:"A", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p14", name:"Disadvantage Funding Reform", owner:"", rag:"A", notes:"", status:"", funding:"Potential major rebalancing of £8bn+ PP/NFF — Consult Summer 2026", deliverables:"New model using income data (not binary FSM); stepped funding; place-based element; consult Summer 2026", collapsed:false,
        phases:[{id:"ph35",name:"Evidence Build",start:0,duration:4,rag:"A",color:"#059669",notes:""},{id:"ph36",name:"Consultation",start:4,duration:5,rag:"A",color:"#34d399",notes:""},{id:"ph37",name:"Design",start:9,duration:6,rag:"G",color:"#047857",notes:""}] },
      { id:"p15", name:"SEND: Inclusive Mainstream Fund", owner:"", rag:"G", notes:"", status:"", funding:"£1.6bn over 3 years — £500m+ per year direct to schools", deliverables:"Direct responsibility over inclusion funding; schools publish Inclusion Strategy", collapsed:false,
        phases:[{id:"ph38",name:"Fund Design",start:0,duration:3,rag:"G",color:"#059669",notes:""},{id:"ph39",name:"Allocations",start:3,duration:4,rag:"G",color:"#34d399",notes:""},{id:"ph40",name:"Delivery",start:7,duration:10,rag:"G",color:"#047857",notes:""}] },
      { id:"p16", name:"Experts at Hand Service", owner:"", rag:"A", notes:"", status:"", funding:"£1.8bn over 3 years: £1bn SLTs/EPs in mainstream; £800m specialist outreach", deliverables:"40 days per primary, 160 days per secondary by 2028/29; SLTs, EPs & professionals in mainstream", collapsed:false,
        phases:[{id:"ph41",name:"Service Design",start:0,duration:4,rag:"A",color:"#059669",notes:""},{id:"ph42",name:"Procurement",start:4,duration:4,rag:"A",color:"#34d399",notes:""},{id:"ph43",name:"Rollout",start:8,duration:8,rag:"G",color:"#047857",notes:""}] },
      { id:"p17", name:"SEND CPD Programme", owner:"", rag:"G", notes:"", status:"", funding:"£200m+ over 3 years — all staff from Sept 2026", deliverables:"All staff nationwide from Sept 2026; updated ITT/ECF; review NPQs; expand EYITT places (double by 2028)", collapsed:false,
        phases:[{id:"ph44",name:"Programme Design",start:0,duration:4,rag:"G",color:"#059669",notes:""},{id:"ph45",name:"Launch",start:4,duration:4,rag:"G",color:"#34d399",notes:""},{id:"ph46",name:"Scale",start:8,duration:8,rag:"G",color:"#047857",notes:""}] },
      { id:"p18", name:"Individual Support Plans (ISPs)", owner:"", rag:"A", notes:"", status:"", funding:"Digital, interactive, integrated over time", deliverables:"Statutory duty: all schools create digital ISPs; annual review minimum; Ofsted assessed", collapsed:false,
        phases:[{id:"ph47",name:"Framework",start:4,duration:5,rag:"A",color:"#059669",notes:""},{id:"ph48",name:"Pilot",start:9,duration:5,rag:"A",color:"#34d399",notes:""},{id:"ph49",name:"Statutory",start:24,duration:6,rag:"G",color:"#047857",notes:""}] },
      { id:"p19", name:"National Inclusion Standards", owner:"", rag:"A", notes:"", status:"", funding:"£15m for evidence base & digital library", deliverables:"Independent expert panel; digital library of identification tools & provision; guide schools by 2028", collapsed:false,
        phases:[{id:"ph50",name:"Expert Panel",start:0,duration:4,rag:"A",color:"#059669",notes:""},{id:"ph51",name:"Standards Dev",start:4,duration:8,rag:"A",color:"#34d399",notes:""},{id:"ph52",name:"Digital Library",start:12,duration:8,rag:"G",color:"#047857",notes:""}] },
      { id:"p20", name:"EP & SLT Workforce Growth", owner:"", rag:"A", notes:"", status:"", funding:"£40m+ over 3 years — 200+ additional EPs per year from 2026", deliverables:"200+ additional EPs per year; expand SLT apprenticeships; local SLT practitioners in every ICB area", collapsed:false,
        phases:[{id:"ph53",name:"Training Pipeline",start:0,duration:5,rag:"A",color:"#059669",notes:""},{id:"ph54",name:"Recruitment Drive",start:5,duration:12,rag:"A",color:"#34d399",notes:""}] },
      { id:"p21", name:"Capital: Inclusive Estate", owner:"", rag:"G", notes:"", status:"", funding:"£3.7bn to 2030 plus £740m in 2025/26 for 10,000 places", deliverables:"50,000+ inclusion base places; accessible buildings; every secondary to have inclusion base over time", collapsed:false,
        phases:[{id:"ph55",name:"2025/26 Wave",start:0,duration:6,rag:"G",color:"#059669",notes:""},{id:"ph56",name:"2026/27 Wave",start:6,duration:8,rag:"G",color:"#34d399",notes:""},{id:"ph57",name:"2027–30",start:24,duration:12,rag:"G",color:"#047857",notes:""}] },
      { id:"p22", name:"Mission North East", owner:"", rag:"G", notes:"", status:"", funding:"London Challenge-inspired model — place-based", deliverables:"Radically improve outcomes for white working-class children; cluster schools; partnership boards", collapsed:false,
        phases:[{id:"ph58",name:"Phase 1",start:0,duration:8,rag:"G",color:"#059669",notes:""},{id:"ph59",name:"Phase 2",start:8,duration:8,rag:"G",color:"#34d399",notes:""},{id:"ph60",name:"Evaluate",start:24,duration:6,rag:"G",color:"#047857",notes:""}] },
    ]
  },
  { id:"th4", color:"#d97706", name:"Withdrawn to Engaging", subtitle:"Belonging, Attendance & Behaviour", rag:"A", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p23", name:"Attendance Target: 94%+ by 2028/29", owner:"", rag:"A", notes:"", status:"", funding:"RISE Attendance & Behaviour Hubs: 90 hub schools, 3,000+/year, 500 intensive", deliverables:"1.3pp improvement = 20m more days; AI-powered benchmarking; personalised improvement targets", collapsed:false,
        phases:[{id:"ph61",name:"Hubs Launch",start:0,duration:4,rag:"A",color:"#d97706",notes:""},{id:"ph62",name:"Scale",start:4,duration:8,rag:"A",color:"#fbbf24",notes:""},{id:"ph63",name:"Target Year",start:24,duration:6,rag:"G",color:"#b45309",notes:""}] },
      { id:"p24", name:"Attendance Mentoring Programme", owner:"", rag:"G", notes:"", status:"", funding:"£15m expansion — 10,000 more persistently absent children with 1:1 mentors", deliverables:"10 additional areas; independent evaluation with YEF; test, learn & grow", collapsed:false,
        phases:[{id:"ph64",name:"Expansion",start:0,duration:5,rag:"G",color:"#d97706",notes:""},{id:"ph65",name:"Evaluate",start:5,duration:5,rag:"G",color:"#fbbf24",notes:""},{id:"ph66",name:"Scale",start:10,duration:8,rag:"G",color:"#b45309",notes:""}] },
      { id:"p25", name:"Behaviour Guidance Refresh", owner:"", rag:"G", notes:"", status:"", funding:"Emphasis on inclusion", deliverables:"Refreshed Behaviour in Schools guidance; updated Suspension & Exclusion guidance; evidence-based toolkit", collapsed:false,
        phases:[{id:"ph67",name:"Draft",start:0,duration:3,rag:"G",color:"#d97706",notes:""},{id:"ph68",name:"Consult",start:3,duration:2,rag:"G",color:"#fbbf24",notes:""},{id:"ph69",name:"Publish",start:5,duration:2,rag:"G",color:"#b45309",notes:""}] },
      { id:"p26", name:"On-Site Suspension Powers", owner:"", rag:"R", notes:"", status:"", funding:"Legislative / guidance change required", deliverables:"Consult on flexibility for schools to suspend on site; duty to set schoolwork for excluded children", collapsed:false,
        phases:[{id:"ph70",name:"Consultation",start:3,duration:5,rag:"R",color:"#d97706",notes:""},{id:"ph71",name:"Legislation",start:8,duration:8,rag:"A",color:"#fbbf24",notes:""}] },
      { id:"p27", name:"Reintegration Support Partnerships", owner:"", rag:"A", notes:"", status:"", funding:"In refreshed Suspension guidance", deliverables:"Formal meeting post-suspension; agreed plan; consult on model; good practice resources", collapsed:false,
        phases:[{id:"ph72",name:"Consult",start:3,duration:4,rag:"A",color:"#d97706",notes:""},{id:"ph73",name:"Guidance",start:7,duration:4,rag:"A",color:"#fbbf24",notes:""},{id:"ph74",name:"Embed",start:11,duration:6,rag:"G",color:"#b45309",notes:""}] },
      { id:"p28", name:"School Profiles", owner:"", rag:"A", notes:"", status:"", funding:"Consider similar for 16-19 providers", deliverables:"Bring Ofsted, attainment, progress, attendance & enrichment data into one place; pilot then launch", collapsed:false,
        phases:[{id:"ph75",name:"Pilot",start:0,duration:4,rag:"A",color:"#d97706",notes:""},{id:"ph76",name:"Launch",start:4,duration:5,rag:"G",color:"#fbbf24",notes:""}] },
    ]
  },
  { id:"th5", color:"#dc2626", name:"High-Quality Staff", subtitle:"Recruitment, Retention & Development", rag:"G", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p29", name:"6,500 More Teachers Delivery Plan", owner:"", rag:"G", notes:"", status:"", funding:"Published alongside WP — 2,300+ already recruited; STEM ITT target met", deliverables:"Attract, Retain, Develop: target shortage subjects, secondary, special & FE", collapsed:false,
        phases:[{id:"ph77",name:"Phase 1",start:0,duration:6,rag:"G",color:"#dc2626",notes:""},{id:"ph78",name:"Phase 2",start:6,duration:8,rag:"G",color:"#f87171",notes:""},{id:"ph79",name:"Phase 3",start:24,duration:8,rag:"G",color:"#b91c1c",notes:""}] },
      { id:"p30", name:"Teacher Pay & Conditions Reform", owner:"", rag:"G", notes:"", status:"", funding:"~10% increase over last two years", deliverables:"Reform statutory pay & conditions; remove pay ceiling; continue accepting STRB recommendations", collapsed:false,
        phases:[{id:"ph80",name:"STRB Process",start:0,duration:4,rag:"G",color:"#dc2626",notes:""},{id:"ph81",name:"Reform",start:4,duration:6,rag:"G",color:"#f87171",notes:""}] },
      { id:"p31", name:"Teacher Training Entitlement", owner:"", rag:"G", notes:"", status:"", funding:"Career-long development", deliverables:"New & improved entitlement: every teacher & leader accesses high-quality CPD; review NPQs; review ECT 2027", collapsed:false,
        phases:[{id:"ph82",name:"Review",start:0,duration:4,rag:"G",color:"#dc2626",notes:""},{id:"ph83",name:"Design",start:4,duration:5,rag:"G",color:"#f87171",notes:""},{id:"ph84",name:"Launch",start:9,duration:6,rag:"G",color:"#b91c1c",notes:""}] },
      { id:"p32", name:"Teacher Retention Programme", owner:"", rag:"G", notes:"", status:"", funding:"Building on flexible working programme — from Autumn 2026", deliverables:"Peer support, coaching, flexible working best practice; protect teaching time", collapsed:false,
        phases:[{id:"ph85",name:"Design",start:3,duration:4,rag:"G",color:"#dc2626",notes:""},{id:"ph86",name:"Launch",start:7,duration:4,rag:"G",color:"#f87171",notes:""},{id:"ph87",name:"Embed",start:11,duration:8,rag:"G",color:"#b91c1c",notes:""}] },
      { id:"p33", name:"Excellence in Leadership", owner:"", rag:"G", notes:"", status:"", funding:"Focus on disadvantaged schools", deliverables:"New mentoring & coaching for headteachers; pilot place-based Headteacher Retention Incentive", collapsed:false,
        phases:[{id:"ph88",name:"Offer Design",start:0,duration:4,rag:"G",color:"#dc2626",notes:""},{id:"ph89",name:"Launch",start:4,duration:8,rag:"G",color:"#f87171",notes:""}] },
    ]
  },
  { id:"th6", color:"#475569", name:"Collaboration", subtitle:"School System Structure", rag:"A", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p34", name:"All Schools in Trusts", owner:"", rag:"A", notes:"", status:"", funding:"Major structural reform — primary legislation required", deliverables:"Move to all schools being part of school trusts; new trusts by LAs or Area Partnerships; rooted in community", collapsed:false,
        phases:[{id:"ph90",name:"Consultation",start:0,duration:5,rag:"A",color:"#475569",notes:""},{id:"ph91",name:"Legislation",start:5,duration:8,rag:"A",color:"#94a3b8",notes:""},{id:"ph92",name:"Implementation",start:24,duration:10,rag:"G",color:"#334155",notes:""}] },
      { id:"p35", name:"Trust Inspection Framework", owner:"", rag:"A", notes:"", status:"", funding:"New Ofsted framework", deliverables:"Proportionate, independent inspection of trust quality; targeted intervention where needed", collapsed:false,
        phases:[{id:"ph93",name:"Framework Dev",start:3,duration:5,rag:"A",color:"#475569",notes:""},{id:"ph94",name:"Consultation",start:8,duration:4,rag:"A",color:"#94a3b8",notes:""},{id:"ph95",name:"Live",start:12,duration:6,rag:"G",color:"#334155",notes:""}] },
      { id:"p36", name:"Local Government Roles & Responsibilities", owner:"", rag:"A", notes:"", status:"", funding:"Links to devolution agenda", deliverables:"Clear roles for LAs in relation to all local schools & partners; deliver for children across community", collapsed:false,
        phases:[{id:"ph96",name:"Policy Design",start:4,duration:5,rag:"A",color:"#475569",notes:""},{id:"ph97",name:"Legislation",start:9,duration:8,rag:"A",color:"#94a3b8",notes:""}] },
    ]
  },
  { id:"th7", color:"#6366f1", name:"Innovation & Ambition", subtitle:"RISE, Technology & Accountability", rag:"G", owner:"", notes:"", collapsed:false,
    projects:[
      { id:"p37", name:"RISE Universal & Targeted Support", owner:"", rag:"G", notes:"", status:"", funding:"Self-improving system", deliverables:"Roll out universal & targeted programmes; attendance & behaviour hubs; reception networks; KS3 alliance", collapsed:false,
        phases:[{id:"ph98",name:"Universal",start:0,duration:5,rag:"G",color:"#6366f1",notes:""},{id:"ph99",name:"Targeted",start:3,duration:8,rag:"G",color:"#818cf8",notes:""},{id:"ph100",name:"Specialist",start:8,duration:8,rag:"G",color:"#4f46e5",notes:""}] },
      { id:"p38", name:"Data, AI & Technology in Schools", owner:"", rag:"G", notes:"", status:"", funding:"Amplify teacher impact, reduce workload", deliverables:"Safe AI tools; Oak National Academy Aila; extensive evidence programme; digital literacy", collapsed:false,
        phases:[{id:"ph101",name:"Evidence",start:0,duration:5,rag:"G",color:"#6366f1",notes:""},{id:"ph102",name:"Pilot",start:5,duration:5,rag:"G",color:"#818cf8",notes:""},{id:"ph103",name:"Scale",start:10,duration:8,rag:"G",color:"#4f46e5",notes:""}] },
      { id:"p39", name:"Accountability System Reform", owner:"", rag:"A", notes:"", status:"", funding:"Rewards inclusive practice", deliverables:"Stronger, more nuanced system; school profiles; broader data; Ofsted grading of inclusion; P8 reform", collapsed:false,
        phases:[{id:"ph104",name:"Consult",start:0,duration:5,rag:"A",color:"#6366f1",notes:""},{id:"ph105",name:"Design",start:5,duration:5,rag:"A",color:"#818cf8",notes:""},{id:"ph106",name:"Implement",start:10,duration:8,rag:"G",color:"#4f46e5",notes:""}] },
      { id:"p40", name:"Single Guidance Hub for Schools", owner:"", rag:"G", notes:"", status:"", funding:"Reduce burden on schools", deliverables:"One easy-to-use home for all school guidance; shorter, clearer, easier to use", collapsed:false,
        phases:[{id:"ph107",name:"Build",start:0,duration:5,rag:"G",color:"#6366f1",notes:""},{id:"ph108",name:"Launch",start:5,duration:4,rag:"G",color:"#818cf8",notes:""}] },
    ]
  },
];

