import { expandBank } from "./bank-expansion.js";
// Original questions, informed by Cambridge 0580 (2025–2027); no official paper text is reproduced.
export const syllabusSource = "https://www.cambridgeinternational.org/Images/662466-2025-2027-syllabus.pdf";
export const officialPapersUrl = "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/past-papers/";
export const paperSpecs = [
  { number: 1, level: "Core", calculator: false, duration: 90, marks: 80 },
  { number: 2, level: "Extended", calculator: false, duration: 120, marks: 100 },
  { number: 3, level: "Core", calculator: true, duration: 90, marks: 80 },
  { number: 4, level: "Extended", calculator: true, duration: 120, marks: 100 },
];
export const examTopics = ["Number", "Algebra", "Geometry", "Mensuration", "Graphs", "Trigonometry", "Statistics", "Probability"];
const integer = (r, min, max) => min + Math.floor(r() * (max - min + 1));
const pick = (r, values) => values[integer(r, 0, values.length - 1)];
const fraction = (n, d) => {
  let a = Math.abs(n), b = Math.abs(d);
  while (b) [a, b] = [b, a % b];
  return `${n / a}/${d / a}`;
};
const sig3 = n => String(Number(n.toPrecision(3)));
const signed = n => n < 0 ? `− ${-n}` : `+ ${n}`;
let serial = 0;

export function makeIGCSEQuestion(topic = "All topics", random = Math.random, options = {}) {
  const selected = topic === "All topics" ? pick(random, examTopics) : topic;
  if (!examTopics.includes(selected)) throw new Error(`Unknown maths topic: ${selected}`);
  const level = options.level || "Extended";
  const calculator = options.calculator ?? true;
  const extended = level === "Extended";
  const n = (min, max) => integer(random, min, max);
  // Each topic has both short technique questions and longer applications.
  const variants = templates(selected, { n, random, extended, calculator });
  const eligible = variants.filter(q => !options.marks || q.marks === options.marks);
  const item = options.variant === undefined ? pick(random, eligible) : eligible[options.variant % eligible.length];
  const { steps, ...question } = item;
  return { id: `igcse-${Date.now()}-${serial++}`, topic: selected, difficulty: item.marks === 3 ? "Exam" : "Medium", type: "numerical",
    original: true, examStyle: true, board: "Cambridge 0580", level, calculator, time: item.marks * 2,
    hint: steps[0], explanation: steps.join(" "), markScheme: steps, ...question };
}

function mainTemplates(topic, { n, random, extended, calculator }) {
  const q = (subtopic, marks, text, answer, steps, extra = {}) => ({ subtopic, marks, text, answer: String(answer), steps, ...extra });
  if (topic === "Number") {
    const price = n(8, 30) * 10, discount = pick(random, [10, 15, 20, 25]);
    const first = n(2, 5), second = n(3, 7), part = n(8, 25), total = (first + second) * part;
    const deposit = n(8, 30) * 100, rate = pick(random, [2, 3, 4, 5]), years = n(2, 4);
    const upper = n(20, 80), width = n(2, 9);
    return [
      q("Percentages", 2, `A jacket is priced at $${price}. In a sale the price is reduced by ${discount}%. Calculate the sale price.`, price * (100 - discount) / 100,
        [`Calculate the reduction: ${price} × ${discount}/100 = ${price * discount / 100}.`, `Subtract the reduction: ${price} − ${price * discount / 100} = $${price * (100 - discount) / 100}.`], { unit: "$" }),
      q("Ratio", 2, `A school shares $${total} between its art and music clubs in the ratio ${first} : ${second}. Calculate the amount received by the music club.`, second * part,
        [`Total ratio parts = ${first} + ${second} = ${first + second}.`, `Music receives ${second}/${first + second} × ${total} = $${second * part}.`], { unit: "$" }),
      extended ? q("Reverse percentages", 3, `After a ${discount}% reduction, a bicycle costs $${price * (100 - discount) / 100}. Calculate the price before the reduction.`, price,
        [`The reduced price is ${100 - discount}% of the original.`, `Use original price × ${(100 - discount) / 100} = ${price * (100 - discount) / 100}.`, `Divide by ${(100 - discount) / 100}: original price = $${price}.`], { unit: "$" })
        : q("Speed, distance and time", 3, `A coach travels ${upper * 2} km in 2 hours. It then travels ${upper} km in 1 hour 30 minutes. Calculate its average speed for the whole journey. Give your answer to 3 significant figures.`, sig3(upper * 3 / 3.5),
          [`Total distance = ${upper * 3} km.`, "Total time = 2 + 1.5 = 3.5 hours.", `Average speed = ${upper * 3} ÷ 3.5 = ${sig3(upper * 3 / 3.5)} km/h.`], { unit: "km/h", accuracy: "3 significant figures" }),
      extended && !calculator ? q("Bounds", 3, `A rectangle has length ${upper} cm and width ${width} cm, each measured to the nearest centimetre. Calculate the upper bound for its area.`, (upper + .5) * (width + .5),
        [`Upper bound of length = ${upper + .5} cm.`, `Upper bound of width = ${width + .5} cm.`, `Upper bound of area = ${upper + .5} × ${width + .5} = ${(upper + .5) * (width + .5)} cm².`], { unit: "cm²" })
        : q(calculator && extended ? "Compound interest" : "Simple interest", 3,
          `$${deposit} is invested at ${rate}% per year ${calculator && extended ? "compound" : "simple"} interest for ${years} years. Calculate the final value. Give your answer to the nearest cent.`,
          calculator && extended ? (deposit * (1 + rate / 100) ** years).toFixed(2) : (deposit * (1 + rate * years / 100)).toFixed(2),
          calculator && extended ? [`Annual multiplier = ${1 + rate / 100}.`, `Final value = ${deposit} × ${1 + rate / 100}^${years}.`, `Round only at the end: $${(deposit * (1 + rate / 100) ** years).toFixed(2)}.`]
            : [`Interest = ${deposit} × ${rate}/100 × ${years} = ${deposit * rate / 100 * years}.`, `Add the interest to the investment.`, `Final value = $${(deposit * (1 + rate * years / 100)).toFixed(2)}.`], { unit: "$", accuracy: "Nearest cent" }),
    ];
  }
  if (topic === "Algebra") {
    const a = n(2, 7), x = n(2, 12), b = n(2, 9), p = n(1, 6), r = n(7, 12), slope = n(2, 7), constant = n(-9, 9);
    const y = n(1, 7), total = x + y, weighted = 2 * x + 3 * y;
    return [
      q("Linear equations", 2, `Solve ${a}(x + ${b}) = ${a * (x + b)}.`, x, [`Divide both sides by ${a}: x + ${b} = ${x + b}.`, `Subtract ${b}: x = ${x}.`]),
      q("Sequences", 2, `The first four terms of a sequence are ${[1, 2, 3, 4].map(i => slope * i + constant).join(", ")}. Find an expression for the nth term.`, `${slope}n${constant === 0 ? "" : constant < 0 ? constant : `+${constant}`}`,
        [`The common difference is ${slope}, so start with ${slope}n.`, `The first term is ${slope + constant}; adjust by ${constant}.`], { type: "shortAnswer" }),
      extended ? q("Quadratic equations", 3, `Solve x² − ${p + r}x + ${p * r} = 0. Give both solutions, separated by a comma.`, `${p},${r}`,
        [`Find two numbers with product ${p * r} and sum ${p + r}.`, `Factorise: (x − ${p})(x − ${r}) = 0.`, `x = ${p} or x = ${r}.`], { answerFormat: "unorderedNumbers", type: "shortAnswer" })
        : q("Equations with brackets", 3, `Solve ${a}(x + ${b}) = ${a + 1}x + ${a * b - x}.`, x,
          [`Expand: ${a}x + ${a * b} = ${a + 1}x + ${a * b - x}.`, `Collect the x terms and constants.`, `x = ${x}.`]),
      extended ? q("Simultaneous equations", 3, `Solve x + y = ${total} and 2x + 3y = ${weighted}. Enter x, y in that order.`, `${x},${y}`,
        [`Multiply the first equation by 2: 2x + 2y = ${2 * total}.`, `Subtract to find y = ${weighted} − ${2 * total} = ${y}.`, `x = ${total} − ${y} = ${x}.`], { answerFormat: "orderedNumbers", type: "shortAnswer" })
        : q("Forming equations", 3, `A rectangle has length (x + ${b}) cm and width x cm. Its perimeter is ${4 * x + 2 * b} cm. Calculate its width.`, x,
          [`Perimeter = 2(x + ${b}) + 2x.`, `4x + ${2 * b} = ${4 * x + 2 * b}.`, `Subtract ${2 * b} and divide by 4: x = ${x} cm.`], { unit: "cm" }),
    ];
  }
  if (topic === "Geometry") {
    const sides = pick(random, [5, 6, 8, 9, 10, 12]), angle = n(25, 65), bearing = n(20, 150), scale = n(2, 5), length = n(3, 12);
    const vx = n(-6, 6), vy = n(1, 7), k = n(2, 4), wx = n(-5, 5), wy = n(-4, 4);
    return [
      q("Polygons", 2, `Calculate one interior angle of a regular ${sides}-sided polygon.`, (sides - 2) * 180 / sides,
        [`Sum of interior angles = (${sides} − 2) × 180° = ${(sides - 2) * 180}°.`, `Divide by ${sides}: ${(sides - 2) * 180 / sides}°.`], { unit: "°" }),
      q("Bearings", 2, `The bearing of harbour B from harbour A is ${String(bearing).padStart(3, "0")}°. Find the bearing of A from B.`, bearing + 180,
        ["Reverse bearings differ by 180°.", `${bearing} + 180 = ${bearing + 180}°.`], { unit: "°" }),
      extended ? q("Circle theorems", 3, `A, B and C lie on a circle with centre O. The minor angle AOB is ${angle * 2}°. C lies on the major arc AB. Calculate angle ACB.`, angle,
        ["Angle ACB stands on the minor arc AB.", "The angle at the centre is twice the angle at the circumference on the same arc.", `Angle ACB = ${angle * 2} ÷ 2 = ${angle}°.`], { unit: "°" })
        : q("Similarity", 3, `Two triangles are similar. Corresponding sides are ${length} cm and ${length * scale} cm. Another side of the smaller triangle is ${length + 2} cm. Calculate the corresponding side of the larger triangle.`, (length + 2) * scale,
          [`The linear scale factor is ${length * scale} ÷ ${length} = ${scale}.`, "Multiply corresponding lengths by the same factor.", `Required length = ${length + 2} × ${scale} = ${(length + 2) * scale} cm.`], { unit: "cm" }),
      extended ? q("Vectors", 3, `Vectors a = (${vx}, ${vy}) and b = (${wx}, ${wy}). Calculate ${k}a − b. Enter the horizontal and vertical components in that order.`, `${k * vx - wx},${k * vy - wy}`,
        [`${k}a = (${k * vx}, ${k * vy}).`, `Subtract corresponding components of b.`, `Result = (${k * vx - wx}, ${k * vy - wy}).`], { type: "shortAnswer", answerFormat: "orderedNumbers" })
        : q("Transformations", 3, `Point P(${vx}, ${vy}) is reflected in the y-axis and then translated by (${wx}, ${wy}). Find its final coordinates. Enter x, y in that order.`, `${-vx + wx},${vy + wy}`,
          [`Reflection in the y-axis changes (${vx}, ${vy}) to (${-vx}, ${vy}).`, `Add the translation (${wx}, ${wy}).`, `Final point = (${-vx + wx}, ${vy + wy}).`], { type: "shortAnswer", answerFormat: "orderedNumbers" }),
    ];
  }
  if (topic === "Mensuration") {
    const base = n(6, 18), height = n(4, 12), r = n(2, 8), h = n(5, 16), outer = n(10, 18), inner = n(3, 7);
    return [
      q("Area", 2, `A trapezium has parallel sides ${base} cm and ${base + 4} cm and perpendicular height ${height} cm. Calculate its area.`, (base + 2) * height,
        [`Area = ½ × (${base} + ${base + 4}) × ${height}.`, `Area = ${(base + 2) * height} cm².`], { unit: "cm²" }),
      q("Volume", 2, `A triangular prism has cross-sectional base ${base} cm, perpendicular height ${height} cm and length ${h} cm. Calculate its volume.`, base * height * h / 2,
        [`Cross-sectional area = ½ × ${base} × ${height} = ${base * height / 2} cm².`, `Volume = ${base * height / 2} × ${h} = ${base * height * h / 2} cm³.`], { unit: "cm³" }),
      calculator ? q("Cylinder volume", 3, `A cylindrical tank has radius ${r} m and height ${h} m. Calculate its volume. Give your answer to 3 significant figures.`, sig3(Math.PI * r * r * h),
        ["Use V = πr²h.", `Substitute: V = π × ${r}² × ${h}.`, `V = ${sig3(Math.PI * r * r * h)} m³ to 3 significant figures.`], { unit: "m³", accuracy: "3 significant figures" })
        : q("Composite area", 3, `A rectangular card measures ${outer} cm by ${height + 3} cm. A rectangle ${inner} cm by ${height} cm is cut out. Calculate the area of the remaining card.`, outer * (height + 3) - inner * height,
          [`Whole area = ${outer} × ${height + 3} = ${outer * (height + 3)} cm².`, `Cut-out area = ${inner} × ${height} = ${inner * height} cm².`, `Remaining area = ${outer * (height + 3) - inner * height} cm².`], { unit: "cm²" }),
      extended ? q("Similar solids", 3, `Two similar containers have corresponding heights ${r} cm and ${r * 2} cm. The smaller has volume ${base * height} cm³. Calculate the volume of the larger container.`, base * height * 8,
        [`Linear scale factor = ${r * 2} ÷ ${r} = 2.`, "Volume scale factor = 2³ = 8.", `Larger volume = ${base * height} × 8 = ${base * height * 8} cm³.`], { unit: "cm³" })
        : q("Surface area", 3, `A closed cuboid measures ${base} cm by ${height} cm by ${h} cm. Calculate its total surface area.`, 2 * (base * height + base * h + height * h),
          ["Surface area = 2(lw + lh + wh).", `Substitute: 2(${base * height} + ${base * h} + ${height * h}).`, `Surface area = ${2 * (base * height + base * h + height * h)} cm².`], { unit: "cm²" }),
    ];
  }
  if (topic === "Graphs") {
    const m = n(2, 6), c = n(-8, 8), x = n(1, 7), run = n(2, 5), x1 = n(-5, 2), y1 = n(-6, 6);
    const distance = n(3, 10) * 10, time = n(2, 6), a = n(-6, 6), b = n(1, 8), shift = n(1, 5);
    return [
      q("Gradient", 2, `A straight line passes through (${x1}, ${y1}) and (${x1 + run}, ${y1 + m * run}). Calculate its gradient.`, m,
        [`Gradient = change in y ÷ change in x = ${m * run} ÷ ${run}.`, `Gradient = ${m}.`]),
      q("Midpoint", 2, `Find the midpoint of A(${a}, ${b}) and B(${a + 2 * shift}, ${b + 2 * run}). Enter x, y in that order.`, `${a + shift},${b + run}`,
        [`Midpoint x = (${a} + ${a + 2 * shift}) ÷ 2 = ${a + shift}.`, `Midpoint y = (${b} + ${b + 2 * run}) ÷ 2 = ${b + run}.`], { type: "shortAnswer", answerFormat: "orderedNumbers" }),
      extended ? q("Equation of a line", 3, `A line has gradient ${m} and passes through (${x}, ${m * x + c}). Find its equation in the form y = mx + c.`, `y=${m}x${c === 0 ? "" : c < 0 ? c : `+${c}`}`,
        [`Start with y = ${m}x + c.`, `Substitute (${x}, ${m * x + c}): c = ${m * x + c} − ${m * x}.`, `Hence y = ${m}x ${signed(c)}.`], { type: "shortAnswer" })
        : q("Distance–time graphs", 3, `A cyclist's distance–time graph is a straight line from (0, 0) to (${time}, ${distance}), where time is in hours and distance is in kilometres. Calculate the cyclist's speed to 3 significant figures.`, sig3(distance / time),
          ["Speed is the gradient of a distance–time graph.", `Speed = ${distance} ÷ ${time}.`, `Speed = ${sig3(distance / time)} km/h.`], { unit: "km/h" }),
      extended ? q("Perpendicular lines", 3, `Line L has gradient ${m}. Line M is perpendicular to L and passes through (0, ${c}). Find the y-coordinate on M when x = ${m * x}.`, c - x,
        [`The perpendicular gradient is −1/${m}.`, `Line M has equation y = −x/${m} ${signed(c)}.`, `At x = ${m * x}, y = ${c - x}.`])
        : q("Linear graphs", 3, `A taxi fare is modelled by C = ${m}d + ${c + 10}, where d is distance in kilometres and C is the cost in dollars. A journey costs $${m * x + c + 10}. Calculate its distance.`, x,
          [`Substitute the fare: ${m * x + c + 10} = ${m}d + ${c + 10}.`, `Subtract ${c + 10}: ${m}d = ${m * x}.`, `Divide by ${m}: d = ${x} km.`], { unit: "km" }),
    ];
  }
  if (topic === "Trigonometry") {
    const scale = n(1, 30), short = 3 * scale, long = 4 * scale, hyp = 5 * scale, angle = n(25, 65), side = n(8, 24);
    const rad = angle * Math.PI / 180, other = n(8, 20);
    return [
      q("Pythagoras' theorem", 2, `Triangle ABC is right-angled at B. AB = ${short} cm and BC = ${long} cm. Calculate AC.`, hyp,
        [`AC² = ${short}² + ${long}² = ${hyp * hyp}.`, `Take the positive square root: AC = ${hyp} cm.`], { unit: "cm", diagram: { kind: "rightTriangle", vertical: `${short} cm`, horizontal: `${long} cm`, diagonal: "AC" } }),
      q("Pythagoras' theorem", 2, `A right-angled triangle has hypotenuse ${hyp} cm and one shorter side ${short} cm. Calculate the length of the other side.`, long,
        [`Missing side² = ${hyp}² − ${short}² = ${long * long}.`, `Missing side = ${long} cm.`], { unit: "cm" }),
      calculator ? q("Right-angled trigonometry", 3, `A ladder of length ${side} m makes an angle of ${angle}° with horizontal ground. Calculate the vertical height reached by the ladder. Give your answer to 3 significant figures.`, sig3(side * Math.sin(rad)),
        ["Use sin θ = opposite / hypotenuse.", `Height = ${side} sin ${angle}°.`, `Height = ${sig3(side * Math.sin(rad))} m.`], { unit: "m", accuracy: "3 significant figures" })
        : extended ? q("Exact trigonometric values", 3, `A right-angled triangle has hypotenuse ${side * 2} cm and an angle of 30°. Calculate the side opposite the 30° angle.`, side,
          ["sin 30° = 1/2.", `Opposite side = ${side * 2} × 1/2.`, `Opposite side = ${side} cm.`], { unit: "cm" })
          : q("Pythagoras in context", 3, `A wire joins the top of a vertical pole to a point ${short} m from its base on level ground. The wire is ${hyp} m long. Calculate the pole's height.`, long,
            ["The pole, ground and wire form a right-angled triangle.", `Height² = ${hyp}² − ${short}² = ${long * long}.`, `Height = ${long} m.`], { unit: "m" }),
      calculator && extended ? q("Cosine rule", 3, `Two sides of a triangle are ${side} cm and ${other} cm. The included angle is ${angle}°. Calculate the third side. Give your answer to 3 significant figures.`, sig3(Math.sqrt(side * side + other * other - 2 * side * other * Math.cos(rad))),
        ["Use c² = a² + b² − 2ab cos C.", `c² = ${side}² + ${other}² − 2 × ${side} × ${other} × cos ${angle}°.`, `c = ${sig3(Math.sqrt(side * side + other * other - 2 * side * other * Math.cos(rad)))} cm.`], { unit: "cm", accuracy: "3 significant figures" })
        : q("Pythagoras in rectangles", 3, `A rectangle measures ${short} cm by ${long} cm. Calculate the total length of its two diagonals.`, hyp * 2,
          [`One diagonal² = ${short}² + ${long}² = ${hyp * hyp}.`, `One diagonal = ${hyp} cm.`, `Both diagonals total ${hyp * 2} cm.`], { unit: "cm" }),
    ];
  }
  if (topic === "Statistics") {
    const v = n(2, 8), f = [n(2, 5), n(3, 7), n(2, 6)], values = [v, v + 2, v + 4];
    const count = f.reduce((a, b) => a + b), total = f.reduce((a, b, i) => a + b * values[i], 0);
    const mean = n(8, 20), size = n(5, 12), missing = n(3, 20), sum = mean * size - missing, sector = pick(random, [30, 45, 60, 90, 120]), sample = n(3, 8) * 24;
    return [
      q("Frequency tables", 2, "The table records the number of books read by a group of students. Calculate the mean number of books. Give your answer to 3 significant figures.", sig3(total / count),
        [`Total books = ${values.map((value, i) => `${value} × ${f[i]}`).join(" + ")} = ${total}.`, `Total students = ${count}, so mean = ${total} ÷ ${count} = ${sig3(total / count)}.`], { table: { headers: ["Books read", "Frequency"], rows: values.map((v, i) => [v, f[i]]) }, accuracy: "3 significant figures" }),
      q("Pie charts", 2, `A pie chart represents ${sample} students. The sector for students who walk to school has angle ${sector}°. Calculate the number who walk.`, sample * sector / 360,
        [`The sector represents ${sector}/360 of the students.`, `Number walking = ${sample} × ${sector}/360 = ${sample * sector / 360}.`]),
      q("Mean", 3, `The mean of ${size} numbers is ${mean}. The sum of ${size - 1} of the numbers is ${sum}. Calculate the remaining number.`, missing,
        [`Total of all ${size} numbers = ${size} × ${mean} = ${size * mean}.`, `Remaining number = ${size * mean} − ${sum}.`, `Remaining number = ${missing}.`]),
      extended ? q("Histograms", 3, `A histogram class interval is ${v} ≤ x < ${v + 10}. It contains ${n(2, 6) * 10} observations. The next class has width 20 and frequency ${count * 4}. Calculate the frequency density of the next class.`, count / 5,
        ["Frequency density = frequency ÷ class width.", `For the next class, divide ${count * 4} by 20.`, `Frequency density = ${count / 5}.`])
        : q("Combined mean", 3, `Group A has 10 students with mean test score ${mean}. Group B has 5 students with mean score ${mean + 6}. Calculate the mean score of all 15 students.`, mean + 2,
          [`Group A total = ${10 * mean}; group B total = ${5 * (mean + 6)}.`, `Combined total = ${15 * mean + 30}.`, `Combined mean = ${15 * mean + 30} ÷ 15 = ${mean + 2}.`]),
    ];
  }
  const red = n(3, 8), blue = n(4, 10), total = red + blue, trials = n(4, 10) * total;
  const num = n(2, 7), den = num + n(2, 8), num2 = n(1, 6), den2 = num2 + n(2, 7);
  return [
    q("Complementary events", 2, `The probability that a bus is late is ${fraction(num, den)}. Calculate the probability that it is not late. Give your answer as a fraction.`, fraction(den - num, den),
      ["Probabilities of complementary events sum to 1.", `P(not late) = 1 − ${fraction(num, den)} = ${fraction(den - num, den)}.`]),
    q("Expected frequency", 2, `A spinner lands on blue with probability ${fraction(red, total)}. It is spun ${trials} times. Calculate the expected number of times it lands on blue.`, trials * red / total,
      ["Expected frequency = number of trials × probability.", `${trials} × ${fraction(red, total)} = ${trials * red / total}.`]),
    extended ? q("Without replacement", 3, `A bag contains ${red} red counters and ${blue} blue counters. Two are selected at random without replacement. Calculate the probability that both are red. Give your answer as a fraction.`, fraction(red * (red - 1), total * (total - 1)),
      [`P(first red) = ${red}/${total}.`, `After a red is removed, P(second red) = ${red - 1}/${total - 1}.`, `Multiply: ${fraction(red * (red - 1), total * (total - 1))}.`])
      : q("Probability from a ratio", 3, `A box contains red, blue and green beads in the ratio ${red} : ${blue} : 2. One bead is chosen at random. Calculate the probability that it is not blue. Give your answer as a fraction.`, fraction(red + 2, total + 2),
        [`Total ratio parts = ${total + 2}.`, `Parts that are not blue = ${red} + 2 = ${red + 2}.`, `Probability = ${fraction(red + 2, total + 2)}.`]),
    extended ? q("Independent events", 3, `Events A and B are independent. P(A) = ${fraction(num, den)} and P(B) = ${fraction(num2, den2)}. Calculate P(A and not B). Give your answer as a fraction.`, fraction(num * (den2 - num2), den * den2),
      [`P(not B) = 1 − ${fraction(num2, den2)} = ${fraction(den2 - num2, den2)}.`, "For independent events multiply the probabilities.", `P(A and not B) = ${fraction(num * (den2 - num2), den * den2)}.`])
      : q("Relative frequency", 3, `A player wins ${red * 5} of ${total * 5} games. Use these results to estimate the probability of winning, then calculate the expected number of wins in ${total * 10} further games.`, red * 10,
        [`Estimated probability = ${red * 5}/${total * 5} = ${fraction(red, total)}.`, `Expected wins = ${total * 10} × ${fraction(red, total)}.`, `Expected wins = ${red * 10}.`]),
  ];
}

function templates(topic, context) {
  const { n, random, extended, calculator } = context;
  const q = (subtopic, marks, text, answer, steps, extra = {}) => ({ subtopic, marks, text, answer: String(answer), steps, ...extra });
  const a = n(2, 8), b = n(2, 9), c = n(1, 6), extra = [];
  if (topic === "Number") {
    extra.push(q("Fraction arithmetic", 2, `Work out ${a}/${a + 1} − 1/${a + 1}. Give your answer as a fraction in its simplest form.`, fraction(a - 1, a + 1),
      [`Subtract the numerators: (${a} − 1)/${a + 1}.`, `Simplify to ${fraction(a - 1, a + 1)}.`]));
    extra.push(q("Standard form", 3, `Work out (${a} × 10^${b}) ÷ (2 × 10^${c}). Give your answer in standard form. Use a × 10^n for your answer.`,
      `${a / 2 >= 1 ? a / 2 : a * 5} × 10^${a / 2 >= 1 ? b - c : b - c - 1}`,
      [`Divide the coefficients: ${a} ÷ 2 = ${a / 2}.`, `Subtract the powers: ${b} − ${c} = ${b - c}.`, "Check that the coefficient is at least 1 and less than 10."], { type: "shortAnswer" }));
  } else if (topic === "Algebra") {
    extra.push(q("Factorising", 2, `Factorise completely ${a}x² + ${a * b}x.`, `${a}x(x+${b})`,
      [`The highest common factor is ${a}x.`, `Divide each term by ${a}x: ${a}x(x + ${b}).`], { type: "shortAnswer" }));
    extra.push(extended ? q("Functions", 3, `The function f is defined by f(x) = ${a}x ${signed(b)}. Find f⁻¹(${a * c + b}).`, c,
      [`Set y = ${a}x + ${b}.`, `Rearrange: x = (y − ${b})/${a}.`, `f⁻¹(${a * c + b}) = (${a * c + b} − ${b})/${a} = ${c}.`])
      : q("Substitution", 3, `A = ${a}b² − ${c}d. Calculate A when b = −${b} and d = ${a}.`, a * b * b - c * a,
        [`b² = (−${b})² = ${b * b}.`, `A = ${a} × ${b * b} − ${c} × ${a}.`, `A = ${a * b * b - c * a}.`]));
  } else if (topic === "Geometry") {
    extra.push(extended ? q("Cyclic quadrilaterals", 2, `ABCD is a cyclic quadrilateral. Angle ABC is ${80 + a * 5}°. Calculate angle ADC.`, 100 - a * 5,
      ["Opposite angles of a cyclic quadrilateral sum to 180°.", `Angle ADC = 180 − ${80 + a * 5} = ${100 - a * 5}°.`], { unit: "°" })
      : q("Angles in parallel lines", 2, `Two parallel lines are crossed by a transversal. Two co-interior angles are ${80 + a * 5}° and x°. Calculate x.`, 100 - a * 5,
        ["Co-interior angles on parallel lines sum to 180°.", `x = 180 − ${80 + a * 5} = ${100 - a * 5}°.`], { unit: "°" }));
    extra.push(q("Enlargement", 3, `Point P(${a}, ${b}) is enlarged with centre (${c}, 0) and scale factor ${extended ? -2 : 3}. Find its image. Enter x, y in that order.`, `${c + (extended ? -2 : 3) * (a - c)},${(extended ? -2 : 3) * b}`,
      [`Vector from the centre to P is (${a - c}, ${b}).`, `Multiply this vector by ${extended ? -2 : 3}.`, `Add the centre to get (${c + (extended ? -2 : 3) * (a - c)}, ${(extended ? -2 : 3) * b}).`], { type: "shortAnswer", answerFormat: "orderedNumbers" }));
  } else if (topic === "Mensuration") {
    extra.push(q("Unit conversion", 2, `A floor has area ${a}.${b} m². Convert this area into cm².`, (a * 10 + b) * 1000,
      ["1 m² = 100 × 100 = 10000 cm².", `${a}.${b} × 10000 = ${(a * 10 + b) * 1000} cm².`], { unit: "cm²" }));
    extra.push(q("Circle area", 3, `A circular garden has radius ${a} m. ${calculator ? "Calculate its area to 3 significant figures." : "Find its area in terms of π. Use pi in your answer."}`, calculator ? sig3(Math.PI * a * a) : `${a * a}pi`,
      ["Use A = πr².", `A = π × ${a}² = ${a * a}π.`, calculator ? `Area = ${sig3(Math.PI * a * a)} m².` : `Area = ${a * a}π m².`], { unit: "m²", type: calculator ? "numerical" : "shortAnswer" }));
  } else if (topic === "Graphs") {
    const root = b === a ? b + 1 : b;
    extra.push(q("Linear graphs", 2, `A straight line has equation y = ${a}x ${signed(b)}. Find its x-coordinate when y = ${a * c + b}.`, c,
      [`Substitute: ${a * c + b} = ${a}x + ${b}.`, `x = (${a * c + b} − ${b})/${a} = ${c}.`]));
    extra.push(extended ? q("Functions and graphs", 3, `The curve y = x² − ${a + root}x + ${a * root} meets the x-axis at two points. Find their x-coordinates, separated by a comma.`, `${a},${root}`,
      ["At the x-axis, y = 0.", `Factorise: (x − ${a})(x − ${root}) = 0.`, `x = ${a} or x = ${root}.`], { type: "shortAnswer", answerFormat: "unorderedNumbers" })
      : q("Distance between points", 3, `A(${a}, ${b}) and B(${a + 3 * c}, ${b + 4 * c}) are points on a coordinate grid. Calculate the length AB.`, 5 * c,
        [`Horizontal and vertical differences are ${3 * c} and ${4 * c}.`, `AB² = ${3 * c}² + ${4 * c}² = ${25 * c * c}.`, `AB = ${5 * c}.`]));
  } else if (topic === "Trigonometry") {
    extra.push(q("Similarity and lengths", 2, `Two right-angled triangles are similar. The smaller has hypotenuse ${5 * c} cm and shorter side ${3 * c} cm. The larger has hypotenuse ${10 * c} cm. Calculate its corresponding shorter side.`, 6 * c,
      ["Linear scale factor = 2.", `Corresponding side = ${3 * c} × 2 = ${6 * c} cm.`], { unit: "cm" }));
    extra.push(calculator ? q("Finding an angle", 3, `A right-angled triangle has opposite side ${a} cm and adjacent side ${b} cm relative to angle θ. Calculate θ. Give your answer to 1 decimal place.`, (Math.atan(a / b) * 180 / Math.PI).toFixed(1),
      [`tan θ = ${a}/${b}.`, "Use inverse tangent in degree mode.", `θ = ${(Math.atan(a / b) * 180 / Math.PI).toFixed(1)}°.`], { unit: "°", accuracy: "1 decimal place" })
      : q("Pythagoras and perimeter", 3, `A right-angled triangle has shorter sides ${5 * c} cm and ${12 * c} cm. Calculate its perimeter.`, 30 * c,
        [`Hypotenuse² = ${5 * c}² + ${12 * c}² = ${169 * c * c}.`, `Hypotenuse = ${13 * c} cm.`, `Perimeter = ${5 * c} + ${12 * c} + ${13 * c} = ${30 * c} cm.`], { unit: "cm" }));
  } else if (topic === "Statistics") {
    extra.push(q("Median", 2, `The times, in minutes, of six journeys are ${a}, ${a + 2}, ${a + 3}, ${a + 7}, ${a + 9}, ${a + 11}. Calculate the median time.`, a + 5,
      ["For six ordered values, use the third and fourth values.", `Median = (${a + 3} + ${a + 7}) ÷ 2 = ${a + 5} minutes.`], { unit: "min" }));
    extra.push(q(extended ? "Interquartile range" : "Range", 3, `The ${extended ? "lower quartile" : "smallest value"} of a set of data is ${a * 5} and the ${extended ? "upper quartile" : "largest value"} is ${a * 5 + b * 3}. Every data value is then multiplied by ${c + 1}. Calculate the ${extended ? "interquartile range" : "range"} of the new data.`, b * 3 * (c + 1),
      [`Original ${extended ? "interquartile range" : "range"} = ${a * 5 + b * 3} − ${a * 5} = ${b * 3}.`, `Multiplying each value by ${c + 1} multiplies the ${extended ? "interquartile range" : "range"} by ${c + 1}.`, `New ${extended ? "interquartile range" : "range"} = ${b * 3 * (c + 1)}.`]));
  } else {
    extra.push(q("Mutually exclusive events", 2, `Events A and B are mutually exclusive. P(A) = ${a}/20 and P(B) = ${b}/20. Calculate P(A or B). Give your answer as a fraction.`, fraction(a + b, 20),
      ["For mutually exclusive events, add the probabilities.", `P(A or B) = ${a}/20 + ${b}/20 = ${fraction(a + b, 20)}.`]));
    extra.push(q("Probability and number", 3, `A bag contains ${a} red counters and some blue counters. The probability of choosing red is ${fraction(a, a + b)}. Calculate the number of blue counters.`, b,
      [`Let the total number of counters be T. Then ${a}/T = ${fraction(a, a + b)}.`, `Solve to obtain T = ${a + b}.`, `Blue counters = ${a + b} − ${a} = ${b}.`]));
  }
  return [...mainTemplates(topic, context), ...extra];
}

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = integer(random, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildIGCSEPaper(number, random = Math.random, exclude = []) {
  const spec = paperSpecs.find(p => p.number === Number(number));
  if (!spec) throw new Error("Choose paper 1, 2, 3 or 4.");
  const questions = [], seen = new Set(exclude), topicOrder = shuffled(examTopics, random);
  for (let i = 0; i < spec.marks / 5; i++) {
    const topic = topicOrder[i % topicOrder.length];
    const parts = [2, 3].map(marks => {
      for (let attempt = 0; attempt < 2000; attempt++) {
        const question = makeIGCSEQuestion(topic, random, { ...spec, marks });
        if (seen.has(question.text)) continue;
        seen.add(question.text);
        return question;
      }
      throw new Error(`Could not find a fresh ${topic} question.`);
    });
    questions.push({ id: `paper-${number}-${serial++}`, topic, subtopic: parts.map(p => p.subtopic).join(" / "),
      text: `${topic}: answer both parts.`, type: "multipart", parts, marks: 5, time: 6,
      level: spec.level, calculator: spec.calculator, original: true, examStyle: true, difficulty: "Exam",
      answer: Object.fromEntries(parts.map((part, index) => [index, part.answer])),
      hint: parts[0].hint, explanation: parts.map((part, i) => `(${String.fromCharCode(97 + i)}) ${part.explanation}`).join(" ") });
  }
  return { ...spec, questions, title: `Paper ${number} · ${spec.level} · ${spec.calculator ? "Calculator" : "Non-calculator"}` };
}

export function buildExamBank() {
  let seed = 5802026;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const questions = [];
  for (const level of ["Core", "Extended"]) {
    for (const topic of examTopics) {
      for (let variant = 0; variant < 6; variant++) {
        const q = makeIGCSEQuestion(topic, random, { level, calculator: true, variant });
        questions.push({ ...q, id: `bank-${level.toLowerCase()}-${topic.toLowerCase()}-${variant}` });
      }
    }
  }
  return expandBank(questions, examTopics);
}
