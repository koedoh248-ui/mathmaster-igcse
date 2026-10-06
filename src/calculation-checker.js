// A small arithmetic parser: no eval, script execution, OCR, or network calls.
export function evaluateCalculation(expression) {
  const source = String(expression).toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/π/g, "pi").replace(/²/g, "^2").replace(/³/g, "^3").replace(/(\d|\))(?=pi|sqrt\()/g, "$1*").replace(/(\d|\)|pi)(?=\()/g, "$1*");
  if (source.length > 500) throw new Error("Calculation too long.");
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|pi|[+*/^()-]/g) || [];
  if (tokens.join("") !== source || !tokens.length) throw new Error("Use numbers, pi, sqrt(), parentheses and arithmetic operators.");
  let index = 0, depth = 0;
  const atom = () => {
    if (++depth > 80) throw new Error("Calculation is nested too deeply.");
    const token = tokens[index++];
    let value;
    if (token === "(") { value = sum(); if (tokens[index++] !== ")") throw new Error("Missing closing bracket."); }
    else if (token === "sqrt") { if (tokens[index++] !== "(") throw new Error("Use sqrt(number)."); value = Math.sqrt(sum()); if (tokens[index++] !== ")") throw new Error("Missing closing bracket."); }
    else if (token === "pi") value = Math.PI;
    else if (token !== undefined && /^\d|^\./.test(token)) value = Number(token);
    else throw new Error("A number is missing.");
    depth--; return value;
  };
  const power = () => { const left = atom(); return tokens[index] === "^" ? (index++, left ** unary()) : left; };
  const unary = () => tokens[index] === "+" ? (index++, unary()) : tokens[index] === "-" ? (index++, -unary()) : power();
  const product = () => {
    let value = unary();
    while (["*", "/"].includes(tokens[index])) { const operator = tokens[index++], right = unary(); value = operator === "*" ? value * right : value / right; }
    return value;
  };
  const sum = () => {
    let value = product();
    while (["+", "-"].includes(tokens[index])) { const operator = tokens[index++], right = product(); value = operator === "+" ? value + right : value - right; }
    return value;
  };
  const value = sum();
  if (index !== tokens.length || !Number.isFinite(value)) throw new Error("This calculation is incomplete or has no finite result.");
  return value;
}

export function checkCalculationLines(working) {
  return String(working || "").split(/\r?\n/).slice(0, 100).map((text, index) => {
    const chunks = text.split("=").map(value => value.trim());
    if (chunks.length < 2) return null;
    // A label, such as 'Area =', is allowed. Algebra and units need human review.
    if (/^[a-zA-Z ]+$/.test(chunks[0])) chunks.shift();
    if (chunks.length < 2) return { line: index + 1, status: "unverified", text, message: "No arithmetic equality to check on this line." };
    try {
      const values = chunks.map(evaluateCalculation);
      const errorIndex = values.findIndex((value, i) => i > 0 && Math.abs(value - values[i - 1]) > Math.max(1e-9, Math.abs(values[i - 1]) * 1e-6));
      if (errorIndex > 0 && errorIndex === values.length - 1 && /^-?\d+(?:\.\d+)?$/.test(chunks[errorIndex])) {
        const digits = chunks[errorIndex].replace(/[-.]/g, "").replace(/^0+/, "").length;
        if (digits > 0 && digits <= 15 && Number(values[errorIndex - 1].toPrecision(digits)) === values[errorIndex]) {
          return { line: index + 1, status: "approximate", text, message: `This result agrees when rounded to ${digits} significant figures. Check the accuracy requested and keep unrounded values for later steps.` };
        }
      }
      return { line: index + 1, status: errorIndex < 0 ? "correct" : "incorrect", text,
        message: errorIndex < 0 ? "The arithmetic on this line is consistent." : `Check this equality: ${chunks[errorIndex - 1]} evaluates to ${Number(values[errorIndex - 1].toPrecision(10))}, while ${chunks[errorIndex]} evaluates to ${Number(values[errorIndex].toPrecision(10))}.` };
    } catch {
      return { line: index + 1, status: "unverified", text, message: "Review this line manually. Algebra, units and approximate equalities are not checked here." };
    }
  }).filter(Boolean);
}
