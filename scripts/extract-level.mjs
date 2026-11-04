import fs from "node:fs";
const paragraphs = JSON.parse(
  fs
    .readFileSync("content/source-paragraphs.json", "utf8")
    .replace(/^\uFEFF/, ""),
);
let stage = "",
  expected = 1;
const challenges = [];
for (let i = 0; i < paragraphs.length; i++) {
  if (paragraphs[i].startsWith("ETAPA ")) stage = paragraphs[i + 1];
  if (paragraphs[i] === String(expected).padStart(2, "0")) {
    challenges.push({
      id: `reto-${String(expected).padStart(2, "0")}`,
      order: expected,
      title: paragraphs[i + 1],
      description: paragraphs[i + 2],
      reflection: paragraphs[i + 3].replace("Para conversar: ", ""),
      stage,
      minutes: expected === 15 ? 60 : expected === 2 ? 10 : 20,
    });
    expected++;
  }
}
if (challenges.length !== 30)
  throw new Error("Se esperaban exactamente 30 retos");
const questions = [
  "Nuestro reto favorito fue…",
  "Una cosa nueva que aprendí de ti…",
  "Algo que hicimos mejor como equipo…",
  "Una costumbre que queremos dejar atrás…",
  "Tres retos que repetiremos este mes…",
  "Nuestro siguiente encuentro será…",
].map((label, i) => ({ id: `pregunta-${i + 1}`, label }));
const level = {
  id: "nivel-1",
  order: 1,
  title: "Volver a elegirnos",
  subtitle: "30 pequeños pasos para una conexión más grande.",
  description:
    "Un viaje para escucharse, agradecer y encontrar nuevas maneras de cuidarse.",
  published: true,
  prerequisiteId: null,
  challenges,
  questions,
};
fs.writeFileSync("content/level-1.json", JSON.stringify(level, null, 2) + "\n");
console.log(
  `Extraídos ${challenges.length} retos y ${questions.length} preguntas.`,
);
