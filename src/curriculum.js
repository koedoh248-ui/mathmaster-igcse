import { checkAnswer, makeGeneratedQuestion, shuffleQuestions } from "./math-engine.js";

export const curriculumUnits = {
  Number: `Types of Numbers
Integers
Positive and Negative Numbers
Factors
Multiples
Prime Numbers
Prime Factorisation
HCF
LCM
Powers
Square Numbers
Cube Numbers
Square Roots
Cube Roots
Fractions
Equivalent Fractions
Adding Fractions
Subtracting Fractions
Multiplying Fractions
Dividing Fractions
Mixed Numbers
Decimals
Fractions and Decimals
Percentages
Finding a Percentage of an Amount
Percentage Increase
Percentage Decrease
Reverse Percentages
Repeated Percentage Change
Ratio
Simplifying Ratios
Sharing in a Ratio
Ratio and Fractions
Direct Proportion
Inverse Proportion
Standard Form
Calculations with Standard Form
Indices
Index Laws
Negative Indices
Fractional Indices
Surds
Simplifying Surds
Rounding
Decimal Places
Significant Figures
Estimation
Error Intervals
Bounds
Speed, Distance and Time
Compound Measures`.split("\n"),
  Algebra: `Algebraic Notation
Variables and Constants
Algebraic Terms
Coefficients
Like Terms
Simplifying Expressions
Expanding Brackets
Factorising
Common Factors
Factorising Quadratics
Algebraic Fractions
Linear Equations
Equations with Brackets
Equations with Fractions
Unknowns on Both Sides
Changing the Subject of a Formula
Inequalities
Inequality Number Lines
Simultaneous Equations
Graphical Simultaneous Equations
Sequences
Arithmetic Sequences
nth Term
Quadratic Sequences
Functions
Function Machines
Function Notation
Inverse Functions
Quadratic Expressions
Solving Quadratics
Quadratic Factorisation
Completing the Square
Quadratic Formula
Quadratic Graphs
Algebraic Proof
Mathematical Proof
Rearranging Formulae
Algebraic Modelling
Multi-Step Algebra Problems`.split("\n"),
  Geometry: `Basic Angle Facts
Angles on a Straight Line
Angles Around a Point
Vertically Opposite Angles
Angles in Triangles
Angles in Quadrilaterals
Interior Angles
Exterior Angles
Regular Polygons
Parallel Lines
Corresponding Angles
Alternate Angles
Co-interior Angles
Triangle Properties
Isosceles Triangles
Equilateral Triangles
Congruence
Similarity
Similar Lengths
Similar Areas
Similar Volumes
Bearings
Three-Figure Bearings
Scale Drawings
Constructions
Perpendicular Bisectors
Angle Bisectors
Loci
Transformations
Reflection
Rotation
Translation
Enlargement
Combined Transformations
Symmetry
Vectors
Vector Notation
Vector Geometry
Geometric Proof`.split("\n"),
  Mensuration: `Perimeter
Area
Area of Rectangles
Area of Triangles
Area of Parallelograms
Area of Trapeziums
Compound Areas
Circumference
Area of Circles
Arc Length
Sector Area
Volume
Cuboids
Prisms
Cylinders
Pyramids
Cones
Spheres
Surface Area
Compound Solids
Unit Conversions
Mixed Mensuration Problems`.split("\n"),
  Graphs: `Coordinates
Plotting Coordinates
Reading Coordinates
Straight-Line Graphs
Gradient
y-intercept
Equation of a Straight Line
Finding Equations from Graphs
Parallel Lines
Perpendicular Lines
Quadratic Graphs
Cubic Graphs
Reciprocal Graphs
Graphical Solutions
Solving Equations Graphically
Distance-Time Graphs
Speed-Time Graphs
Gradient of Distance-Time Graphs
Gradient of Speed-Time Graphs
Area Under Speed-Time Graphs
Graph Transformations
Real-Life Graphs`.split("\n"),
  Trigonometry: `Pythagoras' Theorem
Finding the Hypotenuse
Finding a Missing Side
Introduction to Trigonometry
Opposite, Adjacent and Hypotenuse
SOHCAHTOA
Finding Missing Sides
Finding Missing Angles
Angles of Elevation
Angles of Depression
Bearings and Trigonometry
3D Pythagoras
3D Trigonometry
Sine Rule
Cosine Rule
Area of a Triangle Using Sine
Mixed Trigonometry Problems`.split("\n"),
  Statistics: `Types of Data
Qualitative and Quantitative Data
Discrete and Continuous Data
Primary and Secondary Data
Sampling
Bias
Data Collection
Frequency Tables
Mean
Median
Mode
Range
Weighted Mean
Mean from Frequency Tables
Grouped Data
Estimated Mean
Bar Charts
Pie Charts
Histograms
Frequency Polygons
Cumulative Frequency
Cumulative Frequency Curves
Box Plots
Scatter Diagrams
Correlation
Line of Best Fit
Comparing Data Sets
Interpreting Statistical Data`.split("\n"),
  Probability: `Probability Basics
Probability Scale
Probability of an Event
Complementary Probability
Probability Tables
Sample Spaces
Combined Events
Relative Frequency
Expected Frequency
Venn Diagrams
Tree Diagrams
Independent Events
Conditional Probability
Multi-Step Probability Problems`.split("\n"),
};

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const topicGuides = {
  Number: { prerequisite: "Be comfortable with the four operations and reading numbers.", terms: ["integer", "numerator", "denominator", "percentage", "ratio"], rules: ["Keep place value and units clear.", "Check whether your result is reasonable.", "Show enough working to make your method clear."], formula: "Percentage of an amount = percentage ÷ 100 × amount", why: "Number methods work because they preserve value while changing how a quantity is represented.", mistakes: ["Adding a percentage number directly instead of finding that percentage of the original amount.", "Adding fractions without first using a common denominator."], summary: "Choose a representation that makes the calculation clear, keep the units, and estimate to check your answer." },
  Algebra: { prerequisite: "Know the four operations and how to use negative numbers.", terms: ["variable", "coefficient", "term", "expression", "equation"], rules: ["Collect only like terms.", "Do the same operation to both sides of an equation.", "Check a solution by substituting it back into the original statement."], formula: "For ax + b = c: x = (c − b) ÷ a", why: "Algebra uses symbols to describe number patterns. Equivalent operations preserve equality and reveal the unknown.", mistakes: ["Changing one side of an equation without making the same change to the other.", "Combining unlike terms such as x and x²."], summary: "Keep expressions balanced, use inverse operations carefully, and substitute your answer to check it." },
  Geometry: { prerequisite: "Know basic angle notation and how to use a protractor.", terms: ["angle", "parallel", "perpendicular", "congruent", "similar"], rules: ["State the geometric fact that justifies each angle step.", "Label diagrams clearly; a sketch is not necessarily to scale.", "Use a scale factor consistently for corresponding lengths."], formula: "Angles on a straight line sum to 180°; angles around a point sum to 360°.", why: "Geometric facts follow from how angles and shapes fit together in the plane.", mistakes: ["Assuming a diagram is drawn to scale.", "Confusing equal corresponding lengths with equal areas in similar shapes."], summary: "Mark known facts on the diagram and give a reason whenever you calculate a new result." },
  Mensuration: { prerequisite: "Know multiplication, division and the difference between length and area.", terms: ["perimeter", "area", "volume", "radius", "perpendicular height"], rules: ["Use linear units for length, square units for area, and cubic units for volume.", "Use perpendicular height in area formulae.", "Keep π unrounded until the final step when possible."], formula: "Rectangle A = lw; triangle A = ½bh; prism V = cross-sectional area × length", why: "Area counts square units covering a surface; volume counts cubic units filling a solid.", mistakes: ["Using a sloping side instead of perpendicular height.", "Writing cm instead of cm² or cm³."], summary: "Choose the correct formula, substitute matching units, and include squared or cubed units." },
  Graphs: { prerequisite: "Know how to read ordered pairs and use positive and negative numbers.", terms: ["coordinate", "gradient", "intercept", "axis", "scale"], rules: ["Coordinates are written (x, y).", "Gradient is change in y divided by change in x.", "Choose a scale that uses the grid clearly."], formula: "Gradient = (y₂ − y₁) ÷ (x₂ − x₁); straight line: y = mx + c", why: "A graph shows how one variable changes with another; gradient measures the rate of change.", mistakes: ["Reversing the coordinate order.", "Calculating gradient as change in x divided by change in y."], summary: "Read each axis carefully, plot ordered pairs, and connect graph features to the quantities they represent." },
  Trigonometry: { prerequisite: "Know square roots and identify a right angle in a diagram.", terms: ["hypotenuse", "opposite", "adjacent", "sine", "cosine"], rules: ["The hypotenuse is opposite the right angle.", "Label sides relative to the angle being used.", "Check calculator angle mode before using trigonometric ratios."], formula: "a² + b² = c²; sin θ = opposite/hypotenuse; cos θ = adjacent/hypotenuse; tan θ = opposite/adjacent", why: "Right-triangle ratios stay the same for triangles with the same angle because those triangles are similar.", mistakes: ["Choosing a side label relative to the wrong angle.", "Using Pythagoras on a triangle that is not right-angled."], summary: "Draw and label the triangle, choose a theorem or ratio, then check that the answer fits the diagram." },
  Statistics: { prerequisite: "Be able to order numbers and perform the four operations.", terms: ["data", "frequency", "mean", "median", "range"], rules: ["Order data before finding the median.", "Mean uses every value; median is resistant to extreme values.", "Use the correct class midpoint when estimating grouped data."], formula: "Mean = sum of values ÷ number of values; range = maximum − minimum", why: "Statistics summarises a data set so that its centre, spread and patterns can be compared.", mistakes: ["Forgetting to divide by the total frequency.", "Reading the median before ordering the data."], summary: "Choose a summary that suits the data, show your calculation, and interpret the result in context." },
  Probability: { prerequisite: "Know how to count outcomes and simplify fractions.", terms: ["outcome", "event", "sample space", "independent", "complement"], rules: ["Probabilities lie between 0 and 1.", "For equally likely outcomes, probability = favourable outcomes ÷ total outcomes.", "Mutually exclusive outcomes add; independent successive probabilities multiply."], formula: "P(A) = favourable outcomes / total outcomes; P(not A) = 1 − P(A)", why: "Probability compares how many outcomes support an event with all possible outcomes.", mistakes: ["Using the favourable count as the denominator.", "Adding probabilities for successive independent events instead of multiplying."], summary: "List the outcomes, identify what the question asks for, and use the correct addition or multiplication rule." },
};

const examplesByTopic = {
  Number: [
    ["Find 15% of 80.", ["10% of 80 is 8.", "5% of 80 is 4.", "8 + 4 = 12."], "12"],
    ["Increase 120 by 10%.", ["10% of 120 is 12.", "Add the increase: 120 + 12 = 132."], "132"],
    ["$80 is the price after a 20% discount. Find the original price.", ["80% of the original is $80.", "80 ÷ 0.8 = 100."], "$100"],
  ],
  Algebra: [
    ["Solve 2x + 5 = 15.", ["Subtract 5 from both sides: 2x = 10.", "Divide both sides by 2: x = 5."], "x = 5"],
    ["Expand 3(x + 4).", ["Multiply each term inside the brackets by 3.", "3x + 12."], "3x + 12"],
    ["Factorise x² + 5x + 6.", ["Find two numbers whose product is 6 and sum is 5: 2 and 3.", "(x + 2)(x + 3)."], "(x + 2)(x + 3)"],
  ],
  Geometry: [
    ["One angle on a straight line is 68°. Find the other.", ["Angles on a straight line sum to 180°.", "180° − 68° = 112°."], "112°"],
    ["Find the third angle in a triangle with angles 45° and 65°.", ["Angles in a triangle sum to 180°.", "180° − 45° − 65° = 70°."], "70°"],
    ["A regular hexagon has equal exterior angles. Find one exterior angle.", ["Exterior angles of a polygon sum to 360°.", "360° ÷ 6 = 60°."], "60°"],
  ],
  Mensuration: [
    ["Find the area of a rectangle 8 cm by 5 cm.", ["A = length × width.", "8 × 5 = 40 cm²."], "40 cm²"],
    ["Find the area of a triangle with base 10 cm and perpendicular height 6 cm.", ["A = ½ × base × height.", "½ × 10 × 6 = 30 cm²."], "30 cm²"],
    ["Find the circumference of a circle with radius 7 cm, using π = 22/7.", ["C = 2πr.", "2 × 22/7 × 7 = 44 cm."], "44 cm"],
  ],
  Graphs: [
    ["Find the gradient between (1, 2) and (3, 8).", ["Change in y = 8 − 2 = 6.", "Change in x = 3 − 1 = 2.", "Gradient = 6 ÷ 2 = 3."], "3"],
    ["Find the y-intercept of y = 2x + 5.", ["In y = mx + c, c is the y-intercept.", "Here c = 5."], "5"],
    ["A distance-time graph rises 24 m in 6 s. Find its gradient.", ["Gradient = change in distance ÷ change in time.", "24 ÷ 6 = 4 m/s."], "4 m/s"],
  ],
  Trigonometry: [
    ["A right triangle has shorter sides 6 cm and 8 cm. Find the hypotenuse.", ["c² = 6² + 8².", "c² = 36 + 64 = 100.", "c = 10 cm."], "10 cm"],
    ["In a right triangle, opposite = 5 and hypotenuse = 13. Find sin θ.", ["sin θ = opposite ÷ hypotenuse.", "sin θ = 5/13."], "5/13"],
    ["A right triangle has hypotenuse 10 cm and one shorter side 6 cm. Find the other side.", ["a² = 10² − 6².", "a² = 100 − 36 = 64; a = 8 cm."], "8 cm"],
  ],
  Statistics: [
    ["Find the mean of 3, 5, 7 and 9.", ["Add the values: 3 + 5 + 7 + 9 = 24.", "Divide by 4: mean = 6."], "6"],
    ["Find the median of 2, 5, 8, 10, 15.", ["The data is already ordered.", "The middle value is 8."], "8"],
    ["Find the range of 4, 11, 7, 2, 9.", ["Largest = 11 and smallest = 2.", "Range = 11 − 2 = 9."], "9"],
  ],
  Probability: [
    ["A fair six-sided die is rolled. Find P(6).", ["There is 1 favourable outcome.", "There are 6 equally likely outcomes.", "P(6) = 1/6."], "1/6"],
    ["A bag has 3 red and 7 blue counters. Find P(red).", ["There are 10 counters altogether.", "P(red) = 3/10."], "3/10"],
    ["A fair coin is flipped twice. Find P(two heads).", ["P(heads on the first flip) = 1/2.", "P(heads on the second flip) = 1/2.", "Multiply: 1/2 × 1/2 = 1/4."], "1/4"],
  ],
};

function focusFor(subtopic, topic) {
  const value = subtopic.toLowerCase();
  if (topic === "Number") {
    if (/percent/.test(value)) return { explanation: "A percentage is a number of parts per hundred. Convert it to a fraction or decimal before applying it to an amount.", formula: "p% of A = (p ÷ 100) × A", terms: ["percentage", "per cent", "multiplier"] };
    if (/fraction|mixed number/.test(value)) return { explanation: "A fraction describes equal parts of a whole. Equivalent fractions have the same value even when their numerators and denominators differ.", formula: "a/b + c/d = (ad + bc)/bd", terms: ["numerator", "denominator", "equivalent"] };
    if (/ratio|proportion/.test(value)) return { explanation: "A ratio compares quantities by division. Keep the order of quantities consistent and scale every part by the same factor.", formula: "If a : b = ka : kb, the ratio is unchanged.", terms: ["ratio", "scale factor", "proportion"] };
    if (/factor|multiple|prime|hcf|lcm/.test(value)) return { explanation: "Factors divide a number exactly; multiples are obtained by multiplying it by an integer. Prime factorisation can reveal common factors and multiples.", formula: "HCF uses common prime factors; LCM uses the greatest power of each prime factor.", terms: ["factor", "multiple", "prime"] };
    if (/standard form/.test(value)) return { explanation: "Standard form writes a number as a × 10ⁿ, where 1 ≤ a < 10 and n is an integer.", formula: "a × 10ᵐ × b × 10ⁿ = ab × 10ᵐ⁺ⁿ", terms: ["coefficient", "power of ten", "standard form"] };
    if (/indice|power|square|cube|root/.test(value)) return { explanation: "Indices describe repeated multiplication. Use the index laws only when the base is the same, and remember that a root is the inverse of a power.", formula: "aᵐ × aⁿ = aᵐ⁺ⁿ; aᵐ ÷ aⁿ = aᵐ⁻ⁿ", terms: ["base", "index", "reciprocal"] };
    if (/surd/.test(value)) return { explanation: "A surd is an exact irrational root that cannot be simplified to a rational number. Look for square factors inside the root.", formula: "√(ab) = √a × √b for non-negative a and b", terms: ["surd", "irrational", "square factor"] };
    if (/bound|error interval/.test(value)) return { explanation: "Rounding gives an interval of possible original values. The lower and upper bounds sit halfway to the adjacent rounding values.", formula: "Rounded to the nearest unit u: lower bound = value − u/2; upper bound = value + u/2", terms: ["bound", "lower bound", "upper bound"] };
    if (/speed|compound measure/.test(value)) return { explanation: "A compound measure combines two or more quantities. Make units consistent before substituting into a rate formula.", formula: "Speed = distance ÷ time", terms: ["rate", "unit", "compound measure"] };
    if (/round|significant|decimal place|estimat/.test(value)) return { explanation: "Rounding keeps a chosen level of precision. Inspect the digit immediately after the last digit you keep; estimation checks the scale of an answer.", formula: "Round up when the next digit is 5 or more; otherwise keep the last retained digit.", terms: ["precision", "significant figure", "estimate"] };
    return { explanation: "Place value tells you the value represented by each digit. Use place value and inverse operations to calculate accurately and check your result.", formula: "The value of a digit depends on its position in the number.", terms: ["place value", "integer", "inverse operation"] };
  }
  if (topic === "Algebra") {
    if (/quadratic|completing the square/.test(value)) return { explanation: "A quadratic expression has a highest power of 2. Factorising rewrites it as a product; solving uses the zero-product rule.", formula: "ax² + bx + c = 0; if AB = 0, then A = 0 or B = 0.", terms: ["quadratic", "factor", "root"] };
    if (/equation|unknown/.test(value)) return { explanation: "An equation states that two expressions have equal values. Apply inverse operations to isolate the unknown while maintaining equality.", formula: "If ax + b = c, then x = (c − b)/a for a ≠ 0.", terms: ["equation", "inverse operation", "solution"] };
    if (/sequence|nth term/.test(value)) return { explanation: "A sequence follows a rule. For an arithmetic sequence, the difference between consecutive terms is constant.", formula: "Arithmetic sequence: nth term = first term + (n − 1) × common difference.", terms: ["term", "common difference", "nth term"] };
    if (/function/.test(value)) return { explanation: "A function maps each permitted input to exactly one output. Substitute the input carefully, using brackets for negative values.", formula: "For f(x), f(a) is the output when x = a.", terms: ["input", "output", "function"] };
    if (/inequal/.test(value)) return { explanation: "An inequality compares values that are not necessarily equal. Reverse its direction when multiplying or dividing by a negative number.", formula: "If a < b, then −a > −b.", terms: ["inequality", "solution set", "number line"] };
    if (/factor|expand|term|coefficient|simplif|notation/.test(value)) return { explanation: "An algebraic expression combines terms. Expand by multiplying each term; factorise by reversing expansion; collect only like terms.", formula: "a(b + c) = ab + ac", terms: ["term", "coefficient", "like terms"] };
    if (/simultaneous/.test(value)) return { explanation: "Simultaneous equations share the same unknown values. Elimination or substitution finds values that satisfy both equations.", formula: "A solution must satisfy every equation in the system.", terms: ["elimination", "substitution", "solution pair"] };
    if (/formula|rearrang/.test(value)) return { explanation: "Changing the subject means isolating a chosen variable using inverse operations on both sides.", formula: "Undo operations in reverse order while keeping both sides equal.", terms: ["subject", "inverse operation", "formula"] };
    return { explanation: "Algebra uses letters to represent numbers and express general relationships. Write each operation clearly and preserve equivalence when simplifying.", formula: "Equivalent expressions have the same value for every allowed input.", terms: ["variable", "constant", "expression"] };
  }
  if (topic === "Geometry") {
    if (/angle|parallel|polygon/.test(value)) return { explanation: "Angle facts link angles formed by lines and polygons. Mark known angles and identify the exact rule before calculating.", formula: "Straight line = 180°; full turn = 360°; triangle = 180°.", terms: ["interior angle", "exterior angle", "parallel"] };
    if (/triangle|congruen|similar/.test(value)) return { explanation: "Triangles can be compared by their angles and side lengths. Congruent triangles have equal corresponding sides; similar triangles have equal angles and proportional sides.", formula: "For similar shapes, corresponding lengths have a constant scale factor.", terms: ["corresponding", "congruent", "similar"] };
    if (/bearing|scale/.test(value)) return { explanation: "A bearing is a clockwise angle measured from north and written with three figures. Scale drawings keep a consistent ratio between drawing and real lengths.", formula: "Bearing is measured clockwise from north.", terms: ["bearing", "north line", "scale"] };
    if (/transform|reflection|rotation|translation|enlargement|symmetr/.test(value)) return { explanation: "A transformation maps each point of a shape to an image. Describe the operation using its defining information, such as mirror line, centre, angle or vector.", formula: "Translation by (a, b): (x, y) → (x + a, y + b).", terms: ["image", "object", "invariant"] };
    if (/vector/.test(value)) return { explanation: "A vector describes a directed displacement. Add vectors head-to-tail and keep track of direction as well as magnitude.", formula: "Vector AB = position vector of B − position vector of A.", terms: ["vector", "magnitude", "position vector"] };
    if (/circle/.test(value)) return { explanation: "Circle theorems connect angles, chords, tangents and radii. Name the theorem used and mark the relevant points on a sketch.", formula: "Angle at the centre = 2 × angle at the circumference on the same arc.", terms: ["chord", "tangent", "circumference"] };
    return { explanation: "Geometric reasoning uses definitions and established properties to find unknown measurements. Annotate the diagram and justify each step.", formula: "Use the stated geometric property that matches the diagram.", terms: ["property", "construction", "proof"] };
  }
  if (topic === "Mensuration") {
    if (/circle|circumference|arc|sector/.test(value)) return { explanation: "Circle measurements depend on the radius and the fraction of a full turn. Keep π exact until the final answer if instructed.", formula: "C = 2πr; A = πr²; arc length = (θ/360) × 2πr.", terms: ["radius", "circumference", "sector"] };
    if (/volume|cuboid|prism|cylinder|pyramid|cone|sphere|solid/.test(value)) return { explanation: "Volume measures the space inside a solid. A prism has a constant cross-section; other solids use their own formula.", formula: "Prism volume = cross-sectional area × length.", terms: ["volume", "cross-section", "surface area"] };
    if (/area|trapez|parallelogram/.test(value)) return { explanation: "Area measures the two-dimensional space covered by a shape. Use perpendicular height, not a sloping side.", formula: "Triangle A = ½bh; parallelogram A = bh; trapezium A = ½(a + b)h.", terms: ["area", "base", "perpendicular height"] };
    return { explanation: "Perimeter measures the total distance around a 2D boundary. Add all outside lengths and use a consistent unit.", formula: "Rectangle perimeter = 2(length + width).", terms: ["perimeter", "length", "unit"] };
  }
  if (topic === "Graphs") {
    if (/gradient|straight|line|intercept|parallel|perpendicular/.test(value)) return { explanation: "A straight-line graph has a constant rate of change. Its gradient describes that rate and its intercept shows where it meets an axis.", formula: "y = mx + c; m = (y₂ − y₁)/(x₂ − x₁).", terms: ["gradient", "intercept", "coordinate"] };
    if (/quadratic|cubic|reciprocal/.test(value)) return { explanation: "Curved graphs show non-constant change. Plot accurate points, use a smooth curve, and look for symmetry or asymptotes where relevant.", formula: "For y = x², the graph is symmetric about the y-axis.", terms: ["curve", "turning point", "root"] };
    if (/distance|speed|real-life/.test(value)) return { explanation: "A real-life graph models how quantities change. Read the axes and units; the gradient may represent speed or acceleration.", formula: "Distance-time gradient = speed; speed-time area = distance.", terms: ["time", "gradient", "rate"] };
    if (/coordinate|plot|read/.test(value)) return { explanation: "Coordinates identify a point by its horizontal x-value and vertical y-value. Move along x first, then y.", formula: "A point is written (x, y).", terms: ["coordinate", "x-axis", "y-axis"] };
    return { explanation: "Graphical methods display relationships and can estimate solutions by locating intersections or reading values from a curve.", formula: "A solution to two graphed equations occurs at an intersection.", terms: ["intersection", "scale", "solution"] };
  }
  if (topic === "Trigonometry") {
    if (/pythag|missing side/.test(value)) return { explanation: "Pythagoras' theorem applies only to right-angled triangles. The hypotenuse is the longest side opposite the right angle.", formula: "a² + b² = c².", terms: ["right angle", "hypotenuse", "square root"] };
    if (/sine rule|cosine rule/.test(value)) return { explanation: "The sine and cosine rules solve non-right-angled triangles. Match each side with its opposite angle and use the given information.", formula: "Sine rule: a/sin A = b/sin B = c/sin C.", terms: ["opposite side", "sine rule", "cosine rule"] };
    if (/sohcahtoa|trigon|opposite|adjacent|elevation|depression/.test(value)) return { explanation: "In a right-angled triangle, label the hypotenuse and the sides relative to the chosen angle, then select sine, cosine or tangent.", formula: "SOH: sin θ = O/H; CAH: cos θ = A/H; TOA: tan θ = O/A.", terms: ["opposite", "adjacent", "hypotenuse"] };
    return { explanation: "Trigonometry links angles and side lengths. For three-dimensional problems, identify the right-angled triangle before choosing a method.", formula: "Label a right-angled triangle before using a trigonometric relation.", terms: ["angle", "side", "right-angled triangle"] };
  }
  if (topic === "Statistics") {
    if (/mean|median|mode|range|average/.test(value)) return { explanation: "Averages describe the centre of data in different ways. The mean uses all values, the median is the middle, and the mode is most frequent.", formula: "Mean = Σx/n; range = maximum − minimum.", terms: ["mean", "median", "mode"] };
    if (/frequency|grouped|estimated mean/.test(value)) return { explanation: "Frequency records how often values occur. For grouped data, use class midpoints to estimate a mean because exact individual values are unknown.", formula: "Estimated mean = Σ(f × midpoint) ÷ Σf.", terms: ["frequency", "class interval", "midpoint"] };
    if (/histogram|cumulative|box plot/.test(value)) return { explanation: "Statistical diagrams summarise distributions. Read axes, scales and cumulative frequencies carefully before interpreting a feature.", formula: "Histogram frequency density = frequency ÷ class width.", terms: ["distribution", "quartile", "frequency density"] };
    if (/scatter|correlation|best fit/.test(value)) return { explanation: "A scatter diagram shows paired data. Correlation describes the direction and strength of association; it does not by itself prove causation.", formula: "A line of best fit should follow the trend with roughly balanced points either side.", terms: ["correlation", "association", "outlier"] };
    return { explanation: "Good statistical conclusions depend on suitable data collection, representative samples and clear interpretation of results.", formula: "Consider the data source, sample size and possible bias.", terms: ["sample", "bias", "data"] };
  }
  if (/tree|multi-step|combined/.test(value)) return { explanation: "A tree diagram lists possible outcomes step by step. Multiply along a path and add probabilities from mutually exclusive paths.", formula: "Independent stages: multiply probabilities along a branch.", terms: ["branch", "outcome", "independent"] };
  if (/conditional/.test(value)) return { explanation: "Conditional probability is the probability of an event when additional information is known. The condition changes the relevant sample space.", formula: "P(A | B) = P(A ∩ B) ÷ P(B), when P(B) > 0.", terms: ["condition", "intersection", "sample space"] };
  if (/venn/.test(value)) return { explanation: "A Venn diagram represents sets and their overlaps. Place intersection members first, then fill regions that belong to only one set.", formula: "P(A ∪ B) = P(A) + P(B) − P(A ∩ B).", terms: ["set", "intersection", "union"] };
  if (/relative|expected/.test(value)) return { explanation: "Relative frequency estimates probability from repeated trials. Expected frequency is the estimated probability multiplied by the number of trials.", formula: "Expected frequency = probability × number of trials.", terms: ["trial", "relative frequency", "expected frequency"] };
  return { explanation: "Probability measures how likely an event is. List the equally likely outcomes, count the favourable cases and compare with the total.", formula: "P(event) = favourable outcomes ÷ total equally likely outcomes.", terms: ["event", "outcome", "probability"] };
};

function examplesFor(topic, subtopic) {
  const value = subtopic.toLowerCase();
  if (topic === "Number") {
    if (/percent/.test(value)) return [
      ["Find 12% of 250.", ["10% of 250 is 25.", "2% is 5.", "25 + 5 = 30."], "30"],
      ["Increase 80 by 15%.", ["15% of 80 is 12.", "80 + 12 = 92."], "92"],
      ["$72 is the price after a 10% discount. Find the original price.", ["90% of the original is $72.", "72 ÷ 0.9 = $80."], "$80"],
    ];
    if (/fraction|mixed number/.test(value)) return [
      ["Simplify 18/24.", ["The highest common factor is 6.", "18/24 = 3/4."], "3/4"],
      ["Calculate 1/3 + 1/4.", ["A common denominator is 12.", "4/12 + 3/12 = 7/12."], "7/12"],
      ["Calculate 2 1/2 × 1 1/5.", ["Convert to improper fractions: 5/2 × 6/5.", "Cancel 5; the product is 3."], "3"],
    ];
    if (/ratio|proportion/.test(value)) return [
      ["Simplify 18 : 30.", ["Divide both parts by 6.", "The simplified ratio is 3 : 5."], "3 : 5"],
      ["Share 56 in the ratio 3 : 5. Find the smaller share.", ["There are 8 parts; each is 56 ÷ 8 = 7.", "The smaller share is 3 × 7 = 21."], "21"],
      ["If 4 notebooks cost $6, find the cost of 10 at the same rate.", ["One notebook costs $6 ÷ 4 = $1.50.", "10 cost $15."], "$15"],
    ];
    if (/factor|multiple|prime|hcf|lcm/.test(value)) return [
      ["Write 60 as a product of prime factors.", ["60 = 6 × 10.", "6 = 2 × 3 and 10 = 2 × 5.", "60 = 2² × 3 × 5."], "2² × 3 × 5"],
      ["Find the HCF of 18 and 30.", ["18 = 2 × 3² and 30 = 2 × 3 × 5.", "Common prime factors give HCF = 2 × 3 = 6."], "6"],
      ["Find the LCM of 6 and 8.", ["6 = 2 × 3; 8 = 2³.", "Use the greatest power of each prime: 2³ × 3 = 24."], "24"],
    ];
    if (/indice|power|square|cube|root/.test(value)) return [
      ["Evaluate 2³ × 2⁴.", ["Keep the base and add indices: 2⁷.", "2⁷ = 128."], "128"],
      ["Evaluate 5⁰.", ["Any non-zero number to the power zero is 1."], "1"],
      ["Find √144.", ["12 × 12 = 144.", "Therefore √144 = 12."], "12"],
    ];
    if (/standard form/.test(value)) return [
      ["Write 45,000 in standard form.", ["Move the decimal point four places left.", "45,000 = 4.5 × 10⁴."], "4.5 × 10⁴"],
      ["Calculate (3 × 10⁴)(2 × 10³).", ["Multiply coefficients: 3 × 2 = 6.", "Add indices: 10⁴ × 10³ = 10⁷."], "6 × 10⁷"],
      ["Write 0.00072 in standard form.", ["Move the decimal point four places right to get 7.2.", "The power is negative: 7.2 × 10⁻⁴."], "7.2 × 10⁻⁴"],
    ];
    if (/bound|error interval|round|significant|decimal place|estimat/.test(value)) return [
      ["Round 38.746 to 2 decimal places.", ["The third decimal digit is 6, so round the second digit up.", "Answer: 38.75."], "38.75"],
      ["Give the error interval for 7.2 rounded to the nearest 0.1.", ["Half of 0.1 is 0.05.", "7.15 ≤ x < 7.25."], "7.15 ≤ x < 7.25"],
      ["Estimate 49.8 × 0.203.", ["Round to 50 × 0.2.", "Estimate = 10."], "10"],
    ];
    if (/speed|compound measure/.test(value)) return [
      ["A car travels 150 km in 3 hours. Find its average speed.", ["Speed = distance ÷ time.", "150 ÷ 3 = 50 km/h."], "50 km/h"],
      ["A runner travels at 4 m/s for 25 seconds. Find the distance.", ["Distance = speed × time.", "4 × 25 = 100 m."], "100 m"],
      ["Convert 72 km/h to m/s.", ["72 × 1000 ÷ 3600 = 20.", "The speed is 20 m/s."], "20 m/s"],
    ];
  }
  if (topic === "Algebra") {
    if (/quadratic|complet|factorising quadratic/.test(value)) return [
      ["Factorise x² + 7x + 12.", ["Find factors of 12 that add to 7: 3 and 4.", "(x + 3)(x + 4)."], "(x + 3)(x + 4)"],
      ["Solve x² − x − 12 = 0.", ["Factorise: (x − 4)(x + 3) = 0.", "x = 4 or x = −3."], "x = 4 or x = −3"],
      ["Solve x² + 5x + 6 = 0.", ["Factorise: (x + 2)(x + 3) = 0.", "x = −2 or x = −3."], "x = −2 or x = −3"],
    ];
    if (/sequence|nth term/.test(value)) return [
      ["Find the next term: 4, 7, 10, 13, …", ["The common difference is 3.", "13 + 3 = 16."], "16"],
      ["Find the nth term of 5, 8, 11, 14, …", ["The common difference is 3, so start with 3n.", "The first term is 2 more than 3, giving 3n + 2."], "3n + 2"],
      ["Find the 10th term of 2n + 1.", ["Substitute n = 10.", "2 × 10 + 1 = 21."], "21"],
    ];
    if (/inequal/.test(value)) return [
      ["Solve x + 4 < 9.", ["Subtract 4 from both sides.", "x < 5."], "x < 5"],
      ["Solve 3x ≥ 12.", ["Divide both sides by 3.", "x ≥ 4."], "x ≥ 4"],
      ["Solve −2x < 8.", ["Divide by −2 and reverse the inequality.", "x > −4."], "x > −4"],
    ];
    if (/function/.test(value)) return [
      ["If f(x) = 2x + 3, find f(4).", ["Substitute x = 4.", "f(4) = 8 + 3 = 11."], "11"],
      ["If g(x) = x² − 1, find g(−3).", ["Substitute −3 using brackets.", "(−3)² − 1 = 8."], "8"],
      ["If f(x) = x + 5, find x when f(x) = 12.", ["Set x + 5 = 12.", "Subtract 5: x = 7."], "7"],
    ];
    if (/equation|unknown/.test(value)) return [
      ["Solve 3x − 7 = 11.", ["Add 7: 3x = 18.", "Divide by 3: x = 6."], "6"],
      ["Solve 2(x + 3) = 18.", ["Divide by 2: x + 3 = 9.", "Subtract 3: x = 6."], "6"],
      ["Solve 5x + 2 = 3x + 14.", ["Subtract 3x: 2x + 2 = 14.", "Subtract 2, then divide by 2: x = 6."], "6"],
    ];
  }
  if (topic === "Geometry") {
    if (/angle|parallel|polygon/.test(value)) return [
      ["Angles on a line are x° and 125°. Find x.", ["Angles on a straight line sum to 180°.", "x = 180 − 125 = 55°."], "55°"],
      ["An isosceles triangle has two equal angles of 48°. Find the third.", ["Angles in a triangle sum to 180°.", "180 − 48 − 48 = 84°."], "84°"],
      ["Find one interior angle of a regular pentagon.", ["Interior angle sum = (5 − 2) × 180° = 540°.", "540° ÷ 5 = 108°."], "108°"],
    ];
    if (/triangle|congruen|similar/.test(value)) return [
      ["A triangle has sides 5, 5 and 8 cm. What type has two equal sides?", ["Two equal sides identify an isosceles triangle."], "Isosceles"],
      ["Similar triangles have scale factor 3. A short side is 4 cm. Find its matching side.", ["Multiply the corresponding length by 3.", "4 × 3 = 12 cm."], "12 cm"],
      ["Two similar shapes have length scale factor 2. Find the area scale factor.", ["Area scales by the square of the length factor.", "2² = 4."], "4"],
    ];
    if (/bearing|scale/.test(value)) return [
      ["Write the direction 35° clockwise from north as a bearing.", ["Use three figures and measure clockwise from north.", "Bearing = 035°."], "035°"],
      ["A map scale is 1 : 50,000. What real distance is 4 cm?", ["4 × 50,000 = 200,000 cm.", "200,000 cm = 2 km."], "2 km"],
      ["A bearing is 120°. Find the reverse bearing.", ["Add 180° when the bearing is below 180°.", "120° + 180° = 300°."], "300°"],
    ];
    if (/vector/.test(value)) return [
      ["Add vectors (2, 3) and (4, −1).", ["Add corresponding components.", "(2 + 4, 3 − 1) = (6, 2)."], "(6, 2)"],
      ["Find the vector from A(1, 2) to B(5, 7).", ["Subtract A's coordinates from B's.", "(5 − 1, 7 − 2) = (4, 5)."], "(4, 5)"],
      ["If a = (3, 1), find 2a.", ["Multiply each component by 2.", "2a = (6, 2)."], "(6, 2)"],
    ];
  }
  if (topic === "Mensuration") {
    if (/circle|circumference|arc|sector/.test(value)) return [
      ["Find the circumference of a circle with radius 7 cm using π = 22/7.", ["C = 2πr.", "2 × 22/7 × 7 = 44 cm."], "44 cm"],
      ["Find the area of a circle of radius 3 cm.", ["A = πr².", "A = 9π cm²."], "9π cm²"],
      ["Find the arc length for a 90° sector of radius 8 cm.", ["90° is one quarter of a full turn.", "Arc = ¼ × 2π × 8 = 4π cm."], "4π cm"],
    ];
    if (/volume|cuboid|prism|cylinder|pyramid|cone|sphere|solid/.test(value)) return [
      ["Find the volume of a cuboid 4 cm × 3 cm × 5 cm.", ["V = length × width × height.", "4 × 3 × 5 = 60 cm³."], "60 cm³"],
      ["A prism has cross-sectional area 12 cm² and length 7 cm. Find its volume.", ["V = cross-sectional area × length.", "12 × 7 = 84 cm³."], "84 cm³"],
      ["Find the volume of a cylinder with radius 2 cm and height 5 cm.", ["V = πr²h.", "π × 2² × 5 = 20π cm³."], "20π cm³"],
    ];
    if (/area|trapez|parallelogram/.test(value)) return [
      ["Find the area of a rectangle 7 cm by 4 cm.", ["A = lw = 7 × 4.", "A = 28 cm²."], "28 cm²"],
      ["Find the area of a triangle with base 8 cm and height 5 cm.", ["A = ½bh = ½ × 8 × 5.", "A = 20 cm²."], "20 cm²"],
      ["A trapezium has parallel sides 6 cm and 10 cm, height 4 cm. Find its area.", ["A = ½(a + b)h.", "½ × 16 × 4 = 32 cm²."], "32 cm²"],
    ];
  }
  if (topic === "Graphs") {
    if (/coordinate|plot|read/.test(value)) return [
      ["What is the y-coordinate of (−3, 5)?", ["Coordinates are written (x, y).", "The second value is 5."], "5"],
      ["In which quadrant is (−2, 4)?", ["x is negative and y is positive.", "The point is in quadrant II."], "Quadrant II"],
      ["Reflect (3, −2) in the y-axis.", ["A reflection in the y-axis changes the sign of x.", "The image is (−3, −2)."], "(−3, −2)"],
    ];
    if (/distance|speed|real-life/.test(value)) return [
      ["A car travels 120 km in 2 hours. Find its speed.", ["Speed = distance ÷ time.", "120 ÷ 2 = 60 km/h."], "60 km/h"],
      ["A distance-time graph rises 30 m in 5 s. Find the gradient.", ["Gradient = 30 ÷ 5.", "Speed = 6 m/s."], "6 m/s"],
      ["A speed-time graph shows 8 m/s for 6 s. Find the distance.", ["Distance is the area under the graph.", "8 × 6 = 48 m."], "48 m"],
    ];
  }
  if (topic === "Trigonometry") {
    if (/pythag|missing side/.test(value)) return [
      ["Find the hypotenuse when the shorter sides are 5 cm and 12 cm.", ["c² = 5² + 12² = 169.", "c = 13 cm."], "13 cm"],
      ["A right triangle has hypotenuse 13 cm and one side 5 cm. Find the other.", ["a² = 13² − 5² = 144.", "a = 12 cm."], "12 cm"],
      ["Find the hypotenuse when the shorter sides are 9 cm and 12 cm.", ["c² = 81 + 144 = 225.", "c = 15 cm."], "15 cm"],
    ];
    if (/sine rule/.test(value)) return [
      ["In a triangle, side a = 10 cm, angle A = 30° and angle B = 90°. Find side b.", ["Use the sine rule: b/sin B = a/sin A.", "b/sin 90° = 10/sin 30°, so b = 20 cm."], "20 cm"],
      ["In a triangle, a = 8, A = 30° and B = 90°. Find b.", ["b/sin 90° = 8/sin 30°.", "b = 16."], "16"],
      ["In a triangle, a = 6, A = 30° and B = 90°. Find b.", ["b/sin 90° = 6/sin 30°.", "b = 12."], "12"],
    ];
    return [
      ["In a right triangle, opposite = 6 and hypotenuse = 10. Find sin θ.", ["sin θ = opposite ÷ hypotenuse.", "sin θ = 6/10 = 0.6."], "0.6"],
      ["A right triangle has adjacent side 8 and hypotenuse 10. Find cos θ.", ["cos θ = adjacent ÷ hypotenuse.", "8/10 = 0.8."], "0.8"],
      ["A right triangle has opposite side 5 and adjacent side 12. Find tan θ.", ["tan θ = opposite ÷ adjacent.", "5/12."], "5/12"],
    ];
  }
  if (topic === "Statistics") {
    if (/frequency|grouped|estimated mean/.test(value)) return [
      ["Values 1 and 2 occur 3 and 5 times. Find the mean.", ["Weighted total = 1×3 + 2×5 = 13.", "Total frequency = 8; mean = 13/8 = 1.625."], "1.625"],
      ["Find the midpoint of the interval 10 ≤ x < 20.", ["Midpoint = (10 + 20) ÷ 2.", "Midpoint = 15."], "15"],
      ["A class has frequency 12 and width 3. Find frequency density.", ["Density = frequency ÷ class width.", "12 ÷ 3 = 4."], "4"],
    ];
    if (/median|mode|range|average|mean/.test(value)) return [
      ["Find the mean of 4, 6 and 8.", ["Sum = 18.", "18 ÷ 3 = 6."], "6"],
      ["Find the median of 1, 2, 6, 8, 10.", ["The ordered list has five values.", "The middle value is 6."], "6"],
      ["Find the range of 3, 7, 12, 5.", ["Largest − smallest = 12 − 3.", "Range = 9."], "9"],
    ];
  }
  if (topic === "Probability") {
    if (/conditional/.test(value)) return [
      ["Given that a chosen number is even from 1 to 10, find the probability it is 6.", ["The even outcomes are 2, 4, 6, 8, 10.", "One of the five is 6, so the probability is 1/5."], "1/5"],
      ["A card is known to be a face card in a standard deck. Find P(king).", ["There are 12 face cards and 4 kings.", "4/12 = 1/3."], "1/3"],
      ["If P(A and B) = 0.2 and P(B) = 0.5, find P(A | B).", ["P(A | B) = P(A and B) ÷ P(B).", "0.2 ÷ 0.5 = 0.4."], "0.4"],
    ];
    if (/tree|multi-step|combined|independent/.test(value)) return [
      ["Two fair coins are flipped. Find P(two heads).", ["Multiply the independent probabilities: 1/2 × 1/2.", "P = 1/4."], "1/4"],
      ["A fair die is rolled twice. Find P(two sixes).", ["P = 1/6 × 1/6.", "P = 1/36."], "1/36"],
      ["A bag has 3 red and 2 blue counters. Two are taken without replacement. Find P(two red).", ["P = 3/5 × 2/4.", "P = 6/20 = 3/10."], "3/10"],
    ];
  }
  return examplesByTopic[topic];
}

const extraPracticeByTopic = {
  Number: [["Write 0.375 as a fraction in its simplest form.", "3/8", "0.375 = 375/1000 = 3/8."], ["A £60 item is reduced by 15%. Find the sale price.", "£51", "15% of 60 is 9, so the sale price is £60 − £9 = £51."]],
  Algebra: [["Solve 7x + 3 = 24.", "3", "Subtract 3, then divide 21 by 7."], ["Expand 4(2x − 3).", "8x − 12", "Multiply each term by 4."]],
  Geometry: [["A bearing is 035°. Find the reverse bearing.", "215°", "Add 180° to 035° to get 215°."], ["Find the third angle of a triangle with angles 38° and 77°.", "65°", "180° − 38° − 77° = 65°."]],
  Mensuration: [["A cuboid is 4 cm by 3 cm by 5 cm. Find its volume.", "60 cm³", "4 × 3 × 5 = 60 cm³."], ["Find the circumference of a circle with diameter 10 cm.", "10π cm", "C = πd = 10π cm."]],
  Graphs: [["Find the gradient between (0, 2) and (4, 10).", "2", "(10 − 2) ÷ (4 − 0) = 2."], ["For y = 3x − 4, find y when x = 2.", "2", "3 × 2 − 4 = 2."]],
  Trigonometry: [["Find the hypotenuse when the other sides are 8 cm and 15 cm.", "17 cm", "√(8² + 15²) = √289 = 17 cm."], ["If sin θ = 0.5 and θ is acute, find θ.", "30°", "sin⁻¹(0.5) = 30°." ]],
  Statistics: [["Find the mode of 2, 3, 3, 4, 5.", "3", "3 occurs most often."], ["A data set has mean 7 and 4 values. Find its total.", "28", "Total = mean × number of values = 7 × 4 = 28."]],
  Probability: [["A fair die is rolled. Find P(not 6).", "5/6", "There are five outcomes that are not 6 out of six."], ["A bag has 4 red and 6 blue counters. Find P(blue).", "3/5", "6/10 simplifies to 3/5."]],
};

const challengeByTopic = {
  Number: [["Calculate 25% of 240, then increase your result by 10%.", "66", "25% of 240 is 60; increasing 60 by 10% gives 66."], ["A value is 84 after a 20% decrease. Find the original value.", "105", "84 is 80% of the original, so 84 ÷ 0.8 = 105."]],
  Algebra: [["Solve x² + 7x + 12 = 0.", "x = −3 or x = −4", "(x + 3)(x + 4) = 0, so x = −3 or −4."], ["Solve 3(2x − 1) = 4x + 9.", "6", "Expand to 6x − 3 = 4x + 9; then 2x = 12 and x = 6."]],
  Geometry: [["An isosceles triangle has equal angles of 56°. Find the third angle.", "68°", "180° − 56° − 56° = 68°."], ["Find an exterior angle of a regular 12-sided polygon.", "30°", "Exterior angles total 360°, so 360° ÷ 12 = 30°."]],
  Mensuration: [["Find the volume of a cylinder with radius 3 cm and height 5 cm.", "45π cm³", "V = πr²h = π × 9 × 5 = 45π cm³."], ["A circle has area 49π cm². Find its circumference.", "14π cm", "πr² = 49π gives r = 7; C = 2π × 7 = 14π cm."]],
  Graphs: [["Find the x-intercept of y = −2x + 7.", "3.5", "Set y = 0: −2x + 7 = 0, so x = 3.5."], ["A speed-time graph rises uniformly from 0 to 8 m/s in 4 s. Find the distance travelled.", "16 m", "Distance is the triangle area: ½ × 4 × 8 = 16 m."]],
  Trigonometry: [["A right triangle has perpendicular sides 9 cm and 12 cm. Find its hypotenuse.", "15 cm", "√(9² + 12²) = √225 = 15 cm."], ["In a triangle, a = 10, A = 30° and B = 90°. Find b.", "20", "b/sin 90° = 10/sin 30°, hence b = 20."]],
  Statistics: [["The mean of five numbers is 8. Four total 29. Find the fifth.", "11", "The total is 5 × 8 = 40; the missing value is 40 − 29 = 11."], ["A data set has Q1 = 12 and Q3 = 27. Find its interquartile range.", "15", "IQR = Q3 − Q1 = 27 − 12 = 15."]],
  Probability: [["A bag has 3 red and 2 blue counters. Two are drawn without replacement. Find P(two red).", "3/10", "3/5 × 2/4 = 6/20 = 3/10."], ["P(A) = 0.35. Find P(not A).", "0.65", "Complementary probabilities sum to 1, so 1 − 0.35 = 0.65."]],
};

const examByTopic = {
  Number: ["A jacket costs $72 after a 10% discount. Find its original price.", "$80", "72 ÷ 0.9 = 80; the discounted price is 90% of the original."],
  Algebra: ["Solve 2x² + 7x + 3 = 0.", "x = −3 or x = −1/2", "(2x + 1)(x + 3) = 0, giving x = −1/2 or −3."],
  Geometry: ["The interior angles of a quadrilateral are 82°, 91°, 105° and x°. Find x.", "82°", "A quadrilateral's angles total 360°; x = 360 − 278 = 82°."],
  Mensuration: ["A prism has cross-sectional area 18 cm² and length 12 cm. Find its volume.", "216 cm³", "Volume = cross-sectional area × length = 18 × 12 = 216 cm³."],
  Graphs: ["Find the equation of the line through (0, 3) and (2, 7).", "y = 2x + 3", "Gradient = (7 − 3)/2 = 2 and y-intercept = 3."],
  Trigonometry: ["A right-angled triangle has hypotenuse 13 cm and one side 5 cm. Find the third side.", "12 cm", "√(13² − 5²) = √144 = 12 cm."],
  Statistics: ["The mean of six values is 12. Five values total 53. Find the sixth value.", "19", "The total is 6 × 12 = 72; 72 − 53 = 19."],
  Probability: ["Two fair dice are rolled. Find the probability that their total is 7.", "1/6", "There are 6 favourable ordered pairs out of 36 equally likely pairs: 6/36 = 1/6."],
};

export function enrichLesson(topic, subtopic, base, index, topicLessonList = []) {
  const guide = topicGuides[topic];
  const focus = focusFor(subtopic, topic);
  const examples = examplesFor(topic, subtopic);
  const practiceQuestions = examples.map((example, exampleIndex) => ({
    question: example[0], answer: example[2], explanation: example[1].join(" "), marks: exampleIndex === 2 ? 2 : 1,
    difficulty: ["Easy", "Medium", "Exam"][exampleIndex], hint: guide.rules[exampleIndex % guide.rules.length],
  })).concat((extraPracticeByTopic[topic] || []).map(([question, answer, explanation], exampleIndex) => ({ question, answer, explanation, marks: 2, difficulty: exampleIndex ? "Hard" : "Medium", hint: guide.rules[exampleIndex % guide.rules.length] })));
  const details = {
    prerequisite: guide.prerequisite,
    keyTerms: [...new Set([...focus.terms, ...guide.terms])].slice(0, 6),
    explanation: base?.explanation || `${focus.explanation} In this lesson the focus is ${subtopic.toLowerCase()}.`,
    keyRules: guide.rules,
    formula: focus.formula,
    workedExamples: examples.map(([question, steps, answer]) => ({ question, steps, answer })),
    whyItWorks: `${guide.why} ${focus.explanation}`,
    commonMistakes: guide.mistakes.map((mistake, mistakeIndex) => ({
      mistake,
      correct: mistakeIndex === 0 ? guide.rules[0] : guide.rules[1],
      why: "This changes the mathematical relationship or ignores information given in the question.",
    })),
    quickCheck: practiceQuestions.slice(0, 2).map(item => ({ question: item.question, answer: item.answer })),
    practiceQuestions,
    challenges: challengeByTopic[topic].map(([question, answer, explanation]) => ({ question, answer, explanation })),
    examQuestions: [{ question: examByTopic[topic][0], answer: examByTopic[topic][1], explanation: examByTopic[topic][2], marks: 3 }],
    summary: base?.summary || `${guide.summary} For ${subtopic.toLowerCase()}, remember: ${focus.formula}`,
    keyThings: [...guide.rules, focus.formula],
    nextLessonId: topicLessonList[index + 1]?.id || null,
  };
  return { ...base, id: base?.id || `${slug(topic)}-${slug(subtopic)}`, title: base?.title || subtopic, topic, subtopic, objective: base?.objective || `Understand and apply ${subtopic.toLowerCase()} in IGCSE Mathematics questions.`, ...details };
}

export function expandCurriculumLessons(seedLessons) {
  const result = [];
  for (const [topic, subtopics] of Object.entries(curriculumUnits)) {
    const unitLessons = [];
    const base = seedLessons.filter(lesson => lesson.topic === topic);
    const known = new Set(base.map(lesson => lesson.subtopic.toLowerCase()));
    const generated = subtopics.filter(subtopic => !known.has(subtopic.toLowerCase())).map(subtopic => ({ id: `${slug(topic)}-${slug(subtopic)}`, topic, subtopic, title: subtopic }));
    const combined = [...base, ...generated];
    for (const [index, lesson] of combined.entries()) {
      unitLessons.push(enrichLesson(topic, lesson.subtopic, lesson, index, combined));
    }
    result.push(...unitLessons);
  }
  return result;
}

export function buildUnitMiniTest(topic, lessons, random = Math.random) {
  const questions = shuffleQuestions(lessons.filter(lesson => lesson.topic === topic && Array.isArray(lesson.practiceQuestions))
    .flatMap(lesson => lesson.practiceQuestions.map((item, index) => ({
      id: `unit-${lesson.id}-${index}`,
      topic,
      subtopic: lesson.subtopic,
      difficulty: item.difficulty || "Medium",
      type: "numerical",
      text: item.question,
      answer: item.answer,
      explanation: item.explanation,
      hint: item.hint || lesson.keyRules?.[0] || "",
      marks: item.marks || 1,
      time: 2,
    })))
    .filter((question, index, all) => all.findIndex(other => other.text === question.text) === index), random)
    .slice(0, 15);
  const seen = new Set(questions.map(question => question.text));
  for (let attempt = 0; questions.length < 20 && attempt < 500; attempt++) {
    const generated = makeGeneratedQuestion(topic, random);
    if (seen.has(generated.text) || !checkAnswer(generated, generated.answer)) continue;
    seen.add(generated.text);
    questions.push({ ...generated, id: `unit-${topic.toLowerCase()}-${attempt}`, difficulty: ["Easy", "Medium", "Hard", "Exam"][attempt % 4] });
  }
  return questions.length === 20 ? questions : [];
}
