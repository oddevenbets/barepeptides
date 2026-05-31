(function defineCatalog(root) {
  const products = [
    {
      id: "tirzepatide",
      name: "Tirzepatide",
      image: "tirz-Photoroom.png",
      category: "Glucose and weight research",
      variants: [
        { id: "5mg", amount: "5mg", price: 40 },
        { id: "10mg", amount: "10mg", price: 55 },
        { id: "20mg", amount: "20mg", price: 90 },
        { id: "30mg", amount: "30mg", price: 105 },
        { id: "50mg", amount: "50mg", price: 160 },
        { id: "100mg", amount: "100mg", price: 260 },
      ],
    },
    {
      id: "retatrutide",
      name: "Retatrutide",
      image: "reta-Photoroom.png",
      category: "Weight loss research",
      variants: [
        { id: "5mg", amount: "5mg", price: 55 },
        { id: "10mg", amount: "10mg", price: 85 },
        { id: "20mg", amount: "20mg", price: 130 },
        { id: "30mg", amount: "30mg", price: 170 },
        { id: "50mg", amount: "50mg", price: 275 },
      ],
    },
    {
      id: "semaglutide",
      name: "Semaglutide",
      image: "semag-Photoroom.png",
      category: "Metabolic appetite research",
      variants: [
        { id: "5mg", amount: "5mg", price: 36 },
        { id: "10mg", amount: "10mg", price: 50 },
        { id: "20mg", amount: "20mg", price: 75 },
        { id: "30mg", amount: "30mg", price: 100 },
      ],
    },
    {
      id: "ghk-cu",
      name: "GHK-CU",
      image: "ghk-c-Photoroom.png",
      category: "Regenerative skin research",
      variants: [
        { id: "50mg", amount: "50mg", price: 34 },
        { id: "100mg", amount: "100mg", price: 44 },
      ],
    },
    {
      id: "bpc157",
      name: "BPC157",
      image: "bpc1-Photoroom.png",
      category: "Tissue repair research",
      variants: [
        { id: "5mg", amount: "5mg", price: 40 },
        { id: "10mg", amount: "10mg", price: 65 },
      ],
    },
    {
      id: "klow",
      name: "KLOW",
      image: "klow-Photoroom.png",
      category: "Regenerative blend research",
      variants: [
        { id: "10mg", amount: "10mg", price: 30 },
        { id: "20mg", amount: "20mg", price: 65 },
        { id: "80mg", amount: "80mg", price: 210 },
      ],
    },
    {
      id: "nad-plus",
      name: "NAD+",
      image: "nad+-Photoroom.png",
      category: "Cellular metabolism research",
      variants: [
        { id: "50mg", amount: "50mg", price: 25 },
        { id: "100mg", amount: "100mg", price: 40 },
        { id: "500mg", amount: "500mg", price: 80 },
      ],
    },
    {
      id: "tesamorelin",
      name: "Tesamorelin",
      image: "tesa-Photoroom.png",
      category: "GHRH pathway research",
      variants: [
        { id: "5mg", amount: "5mg", price: 100 },
        { id: "10mg", amount: "10mg", price: 190 },
      ],
    },
    {
      id: "semax",
      name: "Semax",
      image: "semax-Photoroom.png",
      category: "Neuroprotective research",
      variants: [
        { id: "5mg", amount: "5mg", price: 48 },
        { id: "10mg", amount: "10mg", price: 65 },
      ],
    },
    {
      id: "pt-141",
      name: "PT-141",
      image: "pt141-Photoroom.png",
      category: "Melanocortin receptor research",
      variants: [
        { id: "5mg", amount: "5mg", price: 35 },
        { id: "10mg", amount: "10mg", price: 64 },
      ],
    },
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { products };
  } else {
    root.BARETIDES_PRODUCTS = products;
  }
})(typeof window !== "undefined" ? window : globalThis);
