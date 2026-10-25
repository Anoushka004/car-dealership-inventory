// PROTOTYPE ONLY. Fictional stock/prices and representative photography.
const stamp = "2026-10-25T08:00:00Z";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const photo = (name) => `${location.origin}/images/${name}.jpg`;
function listing(n, make, model, year, condition, body, image, opts) {
  const listingId = id(n);
  return {
    id: listingId,
    make,
    model,
    model_year: year,
    condition,
    body_style: body,
    description:
      "Explore the specifications and choose an available vehicle option. Photos are representative demo imagery.",
    photo_urls: [photo(image)],
    features: [
      "Air conditioning",
      "Parking assistance",
      "Bluetooth connectivity",
    ],
    active: true,
    version: 1,
    created_at: stamp,
    updated_at: stamp,
    options: opts.map((o, i) => ({
      id: id(n * 10 + i),
      listing_id: listingId,
      trim: o.trim || "Standard",
      color: o.color || "Silver",
      fuel_type: o.fuel || "petrol",
      transmission: o.transmission || "automatic",
      price: o.price,
      currency: "INR",
      stock: o.stock ?? 2,
      active: true,
      version: 1,
      photo_urls: [photo(image)],
      created_at: stamp,
      updated_at: stamp,
      ...(condition === "used"
        ? {
            mileage_km: 28000 + n * 1000,
            previous_owner_count: 1,
            condition_notes:
              "Sample condition record. Light wear to seats; small scratches on rear bumper. Physical inspection details belong here.",
            vin: `DEMOVEHICLE${n}${i}`,
          }
        : {}),
    })),
  };
}
export function initialStore() {
  return {
    listings: [
      listing(1, "BMW", "5 Series", 2025, "new", "sedan", "bmw", [
        {
          trim: "520i Sport",
          color: "Mineral Grey",
          price: "4590000.00",
          stock: 3,
        },
        {
          trim: "530i Luxury",
          color: "Alpine White",
          price: "5290000.00",
          stock: 1,
        },
        {
          trim: "520i Sport",
          color: "Black Sapphire",
          price: "4690000.00",
          stock: 0,
        },
      ]),
      listing(2, "Chevrolet", "Camaro", 2022, "used", "coupe", "sedan", [
        { trim: "SS", color: "Blue", price: "7800000.00", stock: 1 },
      ]),
      listing(3, "Honda", "CR-V", 2023, "used", "suv", "suv", [
        {
          trim: "EX",
          color: "White",
          fuel: "petrol",
          price: "5890000.00",
          stock: 1,
        },
      ]),
      listing(4, "Tesla", "Model 3", 2025, "new", "sedan", "electric", [
        {
          trim: "Standard Range",
          color: "Pearl White",
          fuel: "electric",
          price: "3990000.00",
          stock: 2,
        },
        {
          trim: "Long Range",
          color: "Pearl White",
          fuel: "electric",
          price: "4790000.00",
          stock: 1,
        },
      ]),
      listing(5, "Porsche", "Panamera", 2021, "used", "sedan", "hatch", [
        { trim: "Standard", color: "Black", price: "8900000.00", stock: 1 },
      ]),
    ],
    orders: [],
  };
}
export const categories = {
  body_style: [
    "hatchback",
    "sedan",
    "suv",
    "crossover",
    "coupe",
    "convertible",
    "wagon",
    "van",
    "pickup",
    "other",
  ],
  fuel_type: [
    "petrol",
    "diesel",
    "electric",
    "hybrid",
    "plug_in_hybrid",
    "cng",
    "lpg",
    "other",
  ],
  transmission: ["manual", "automatic", "other"],
  condition: ["new", "used"],
};
export const emptyFilters = {
  q: "",
  condition: "",
  body_style: "",
  fuel_type: "",
  transmission: "",
  price_min: "",
  price_max: "",
  year_min: "",
  year_max: "",
  include_unavailable: false,
  sort: "newest",
};
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
export const title = (value) =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const available = (l, o) => l.active && o.active && o.stock > 0;
export function matching(listings, f, admin = false) {
  return listings
    .filter(
      (l) =>
        (admin || l.active) &&
        (!f.condition || l.condition === f.condition) &&
        (!f.body_style || l.body_style === f.body_style) &&
        (!f.year_min || l.model_year >= Number(f.year_min)) &&
        (!f.year_max || l.model_year <= Number(f.year_max)),
    )
    .map((l) => {
      const q = f.q.trim().toLowerCase();
      const options = l.options.filter(
        (o) =>
          (admin || o.active) &&
          (f.include_unavailable || available(l, o)) &&
          (!q ||
            `${l.make} ${l.model}`.toLowerCase().includes(q) ||
            o.trim.toLowerCase().includes(q)) &&
          (!f.fuel_type || o.fuel_type === f.fuel_type) &&
          (!f.transmission || o.transmission === f.transmission) &&
          (!f.price_min || Number(o.price) >= Number(f.price_min)) &&
          (!f.price_max || Number(o.price) <= Number(f.price_max)),
      );
      return {
        ...l,
        matching_option_ids: options.map((o) => o.id),
        lowest_matching_price: options.length
          ? Math.min(...options.map((o) => Number(o.price))).toFixed(2)
          : null,
        available: options.some((o) => available(l, o)),
      };
    })
    .filter((l) => l.matching_option_ids.length)
    .sort((a, b) => {
      const sorts = {
        price_asc:
          Number(a.lowest_matching_price) - Number(b.lowest_matching_price),
        price_desc:
          Number(b.lowest_matching_price) - Number(a.lowest_matching_price),
        year_asc: a.model_year - b.model_year,
        year_desc: b.model_year - a.model_year,
        newest: b.id.localeCompare(a.id),
        oldest: a.id.localeCompare(b.id),
      };
      return sorts[f.sort] || a.id.localeCompare(b.id);
    });
}
export function snapshot(l, o) {
  const { make, model, model_year, condition, body_style } = l;
  const {
    trim,
    color,
    fuel_type,
    transmission,
    mileage_km,
    previous_owner_count,
    condition_notes,
    vin,
  } = o;
  return {
    make,
    model,
    model_year,
    condition,
    body_style,
    trim,
    color,
    fuel_type,
    transmission,
    photo_urls: o.photo_urls.length ? o.photo_urls : l.photo_urls,
    ...(condition === "used"
      ? { mileage_km, previous_owner_count, condition_notes, vin }
      : {}),
  };
}
