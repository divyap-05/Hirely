/* Shared DRDO prototype data used by the landing page, candidate portal and expert portal. */
const DRDO_GRADES = [
  { grade: "Scientist ‘B’", level: "Level 10", experience: "Entry level / no experience", route: "Regular entry" },
  { grade: "Scientist ‘C’", level: "Level 11", experience: "3+ years relevant experience", route: "Higher-grade / lateral recruitment" },
  { grade: "Scientist ‘D’", level: "Level 12", experience: "7+ years relevant experience", route: "Higher-grade / lateral recruitment" },
  { grade: "Scientist ‘E’", level: "Level 13", experience: "10+ years relevant experience", route: "Higher-grade / lateral recruitment" },
  { grade: "Scientist ‘F’", level: "Level 13A", experience: "13+ years relevant experience", route: "Higher-grade / lateral recruitment" },
  { grade: "Scientist ‘G’", level: "Level 14", experience: "15+ years relevant experience", route: "Higher-grade / lateral recruitment" },
  { grade: "Scientist ‘H’", level: "Level 15", experience: "Senior / outstanding scientist grade", route: "Promotion / limited higher-grade induction" },
  { grade: "Distinguished Scientist", level: "Level 16", experience: "Senior-most scientific leadership", route: "Personal upgradation / senior leadership" }
];

const DRDO_POSITIONS = [
  { id:"b-cse", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Computer Science & Engineering", location:"Bengaluru", lab:"CAIR", skills:["Computer Science","AI/ML","Cyber Security"] },
  { id:"b-ece", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Electronics & Communication Engineering", location:"Dehradun", lab:"DEAL", skills:["Electronics","Communication","Radar"] },
  { id:"b-ee", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Electrical Engineering", location:"Bengaluru", lab:"DRDO Establishments", skills:["Electrical Systems","Control","Power Electronics"] },
  { id:"b-me", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Mechanical Engineering", location:"Chennai", lab:"CVRDE", skills:["Mechanical Systems","Vehicles","Design"] },
  { id:"b-aero", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Aeronautical Engineering", location:"Bengaluru", lab:"ADE", skills:["UAVs","Aerodynamics","Flight Systems"] },
  { id:"b-met", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Metallurgy / Materials Engineering", location:"Hyderabad", lab:"DMRL", skills:["Metallurgy","Materials","Composites"] },
  { id:"b-phy", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Physics", location:"Delhi", lab:"SSPL", skills:["Physics","Sensors","Materials"] },
  { id:"b-chem", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Chemistry", location:"Gwalior", lab:"DRDE", skills:["Chemistry","Analysis","Life Sciences"] },
  { id:"b-chemical", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Chemical Engineering", location:"Gwalior", lab:"DRDE", skills:["Chemical Processes","Safety","Defence Applications"] },
  { id:"b-civil", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Civil Engineering", location:"Pune", lab:"DRDO Establishments", skills:["Structures","Infrastructure","Civil Engineering"] },
  { id:"b-math", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Mathematics / Statistics / OR", location:"Delhi", lab:"ISSA", skills:["Mathematics","Modelling","Operations Research"] },
  { id:"b-biomed", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Biomedical Engineering", location:"Bengaluru", lab:"DEBEL", skills:["Biomedical","Electromedical Systems","Human Factors"] },
  { id:"b-psych", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Psychology", location:"Delhi", lab:"DIPR", skills:["Psychology","Human Factors","Personnel Research"] },
  { id:"b-life", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Life Sciences", location:"Haldwani", lab:"DIBER", skills:["Life Sciences","Biology","Environmental Research"] },
  { id:"b-textile", grade:"Scientist ‘B’", title:"Scientist ‘B’ – Textile Engineering", location:"Kanpur", lab:"DRDO Establishments", skills:["Textiles","Materials","Protective Systems"] },

  { id:"c-cse", grade:"Scientist ‘C’", title:"Scientist ‘C’ – Computer Science & Engineering", location:"Bengaluru", lab:"CAIR", skills:["AI/ML","Cyber Security","Software Systems"] },
  { id:"c-ece", grade:"Scientist ‘C’", title:"Scientist ‘C’ – Electronics & Communication Engineering", location:"Hyderabad", lab:"DRDO Establishments", skills:["RF Systems","Communication","Signal Processing"] },
  { id:"d-me", grade:"Scientist ‘D’", title:"Scientist ‘D’ – Mechanical Engineering", location:"Chennai", lab:"CVRDE", skills:["Vehicle Systems","Mechanical Design","R&D"] },
  { id:"d-aero", grade:"Scientist ‘D’", title:"Scientist ‘D’ – Aeronautical Engineering", location:"Bengaluru", lab:"ADE", skills:["Aerodynamics","UAVs","Flight Systems"] },
  { id:"e-ece", grade:"Scientist ‘E’", title:"Scientist ‘E’ – Electronics & Communication Engineering", location:"Hyderabad", lab:"DRDO Establishments", skills:["Advanced Electronics","Radar","Communication Systems"] },
  { id:"f-cse", grade:"Scientist ‘F’", title:"Scientist ‘F’ – Advanced Computing & AI", location:"Bengaluru", lab:"CAIR", skills:["AI/ML","Advanced Computing","Cyber Security"] },
  { id:"g-aero", grade:"Scientist ‘G’", title:"Scientist ‘G’ – Aerospace Systems", location:"Bengaluru", lab:"Aeronautical Establishments", skills:["Aerospace","Systems Engineering","Leadership"] },
  { id:"h-rd", grade:"Scientist ‘H’", title:"Scientist ‘H’ – Advanced Defence R&D", location:"Delhi", lab:"DRDO / RAC", skills:["R&D Leadership","Systems Engineering","Technology Strategy"] },
  { id:"ds-rd", grade:"Distinguished Scientist", title:"Distinguished Scientist – Defence R&D Leadership", location:"Delhi", lab:"DRDO Headquarters", skills:["Scientific Leadership","Defence Technology","R&D Strategy"] }
];

const DRDO_LOCATIONS = [...new Set(DRDO_POSITIONS.map(p => p.location))].sort();
