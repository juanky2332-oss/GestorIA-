messages: [
  {
    role: "user",
    content: [
      { 
        type: "text", 
        text: `
          Actúa como un auditor contable experto. Analiza este documento visualmente.
          Extrae la información con máxima precisión para rellenar un formulario financiero.
          
          NECESITO ESTE FORMATO JSON EXACTO (Respeta los nombres de las claves):
          {
            "tipo": "Factura" o "Ticket" o "Albarán",
            "fecha": "DD/MM/YYYY" (Busca la fecha de emisión),
            "proveedor": "Nombre COMPLETO de la empresa emisora (Busca CIF/NIF si ayuda)",
            "concepto_principal": "Descripción breve y clara de qué se está cobrando (Ej: 'Servicios de consultoría' o 'Material de oficina')",
            "base_imponible": 0.00 (El subtotal antes de impuestos. Si no hay, calcula Total - Impuestos),
            "impuestos_porcentaje": 0 (Ej: 21, 10, 4. Si hay varios, pon el principal o haz media),
            "total": 0.00 (El importe final a pagar),
            "conceptos": ["Lista detallada de todos los items si es posible"]
          }

          - Si no encuentras la "Base Imponible" explícita, búscala como "Subtotal" o "Base".
          - El "concepto_principal" debe ser un resumen inteligible de 4-5 palabras.
          - Si hay varios tipos de IVA, indica el más alto en "impuestos_porcentaje".
        ` 
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Data}`
        }
      }
    ]
  }
],
