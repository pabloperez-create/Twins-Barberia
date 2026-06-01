// src/utils/tema.js
// Paleta centralizada para theming barbería (negro/dorado) vs salón (rosado)

export const TEMAS = {
  barberia: {
    // Fondos
    bg: "bg-stone-950",
    bgCard: "bg-stone-900",
    bgInput: "bg-stone-800",
    bgHover: "hover:bg-stone-700",
    bgMuted: "bg-stone-800",

    // Bordes
    border: "border-stone-700",
    borderInput: "border-stone-700",

    // Textos
    texto: "text-white",
    textoSub: "text-stone-400",
    textoMuted: "text-stone-500",

    // Acento (dorado)
    acento: "text-amber-200",
    acentoBg: "bg-amber-200",
    acentoBgHover: "hover:bg-amber-100",
    acentoText: "text-stone-950",
    acentoBgOpacity: "bg-amber-200 bg-opacity-20",

    // Tabs
    tabActivo: "border-b-2 border-amber-200 text-amber-200",
    tabInactivo: "text-stone-400 hover:text-stone-200",

    // Botón primario
    boton: "bg-amber-200 hover:bg-amber-100 text-stone-950 font-bold",

    // Filtro activo (ej: botones Hoy/Próximas)
    filtroActivo: "bg-amber-200 text-stone-950",
    filtroInactivo: "bg-stone-800 text-stone-300 hover:bg-stone-700",

    // Badge plan
    badgePro: "bg-violet-900 text-violet-200",
    badgePlus: "bg-amber-900 text-amber-200",
    badgeBase: "bg-stone-700 text-stone-300",

    // Calendario (FullCalendar CSS)
    calendarCSS: `
      .fc { background-color: #1c1917; color: #e7e5e4; }
      .fc-theme-standard td, .fc-theme-standard th { border-color: #44403c; }
      .fc-theme-standard .fc-scrollgrid { border-color: #44403c; }
      .fc-col-header-cell { background-color: #292524; color: #a8a29e; font-weight: 600; padding: 10px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
      .fc-daygrid-day-number { color: #a8a29e; padding: 8px; }
      .fc-day-today { background-color: rgba(253, 230, 138, 0.08) !important; }
      .fc-day-today .fc-daygrid-day-number { color: #fde68a; font-weight: 700; }
      .fc-timegrid-slot-label { color: #78716c; font-size: 11px; }
      .fc-timegrid-axis { background-color: #1c1917; }
      .fc-event { border: none !important; padding: 3px 6px !important; font-size: 11px !important; cursor: pointer; border-radius: 4px !important; margin-bottom: 2px !important; font-weight: 600; }
      .fc-event:hover { opacity: 0.85; transform: scale(1.02); transition: transform 0.1s; }
      .fc-event-title, .fc-event-time { color: white !important; }
      .reserva-cancelada { text-decoration: line-through; opacity: 0.4 !important; }
      .bloqueo .fc-event-title { font-style: italic; }
      .fc-toolbar-title { color: #fde68a !important; }
      .fc-button { background-color: #44403c !important; border: 1px solid #57534e !important; color: #e7e5e4 !important; padding: 6px 12px !important; font-size: 13px !important; }
      .fc-button:hover { background-color: #57534e !important; }
      .fc-button-primary:not(:disabled).fc-button-active { background-color: #fde68a !important; color: #1c1917 !important; border-color: #fde68a !important; }
      .fc-more-link { color: #a8a29e !important; font-weight: 600; font-size: 11px; }
      .fc-more-link:hover { color: #fde68a !important; }
      .fc-popover { max-height: 260px !important; overflow-y: auto !important; background-color: #1c1917 !important; border: 1px solid #44403c !important; border-radius: 8px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; }
      .fc-popover-header { background-color: #292524 !important; color: #fde68a !important; padding: 8px 12px !important; font-weight: 700 !important; border-radius: 8px 8px 0 0 !important; }
      .fc-popover-body { padding: 6px !important; overflow-y: auto !important; max-height: 210px !important; }
      .fc-popover-close { color: #a8a29e !important; font-size: 16px !important; }
      .fc-popover-close:hover { color: #fde68a !important; }
    `,

    // Recharts tooltip
    tooltipStyle: { backgroundColor: "#1c1917", border: "1px solid #44403c", borderRadius: "8px", color: "#fff" },
    chartColor: "#e5d59a",
    chartColors: ["#e5d59a", "#a3a3a3", "#78716c", "#d6b96e", "#b8b8b8"],

    tipo: "barberia",
  },

  salon: {
    // Fondos
    bg: "bg-pink-50",
    bgCard: "bg-white",
    bgInput: "bg-pink-50",
    bgHover: "hover:bg-pink-100",
    bgMuted: "bg-pink-50",

    // Bordes
    border: "border-pink-200",
    borderInput: "border-pink-300",

    // Textos
    texto: "text-gray-800",
    textoSub: "text-pink-400",
    textoMuted: "text-pink-300",

    // Acento (rosado)
    acento: "text-pink-600",
    acentoBg: "bg-pink-500",
    acentoBgHover: "hover:bg-pink-600",
    acentoText: "text-white",
    acentoBgOpacity: "bg-pink-500 bg-opacity-10",

    // Tabs
    tabActivo: "border-b-2 border-pink-500 text-pink-600",
    tabInactivo: "text-pink-300 hover:text-pink-500",

    // Botón primario
    boton: "bg-pink-500 hover:bg-pink-600 text-white font-bold",

    // Filtro activo
    filtroActivo: "bg-pink-500 text-white",
    filtroInactivo: "bg-white text-pink-400 border border-pink-200 hover:bg-pink-50",

    // Badge plan
    badgePro: "bg-violet-100 text-violet-700",
    badgePlus: "bg-pink-100 text-pink-700",
    badgeBase: "bg-gray-100 text-gray-600",

    // Calendario (FullCalendar CSS)
    calendarCSS: `
      .fc { background-color: #fff0f5; color: #374151; }
      .fc-theme-standard td, .fc-theme-standard th { border-color: #fbcfe8; }
      .fc-theme-standard .fc-scrollgrid { border-color: #fbcfe8; }
      .fc-col-header-cell { background-color: #fce7f3; color: #9d174d; font-weight: 600; padding: 10px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
      .fc-daygrid-day-number { color: #be185d; padding: 8px; }
      .fc-day-today { background-color: rgba(236, 72, 153, 0.08) !important; }
      .fc-day-today .fc-daygrid-day-number { color: #db2777; font-weight: 700; }
      .fc-timegrid-slot-label { color: #f9a8d4; font-size: 11px; }
      .fc-timegrid-axis { background-color: #fff0f5; }
      .fc-event { border: none !important; padding: 3px 6px !important; font-size: 11px !important; cursor: pointer; border-radius: 4px !important; margin-bottom: 2px !important; font-weight: 600; }
      .fc-event:hover { opacity: 0.85; transform: scale(1.02); transition: transform 0.1s; }
      .fc-event-title, .fc-event-time { color: white !important; }
      .reserva-cancelada { text-decoration: line-through; opacity: 0.4 !important; }
      .bloqueo .fc-event-title { font-style: italic; }
      .fc-toolbar-title { color: #db2777 !important; }
      .fc-button { background-color: #fce7f3 !important; border: 1px solid #fbcfe8 !important; color: #9d174d !important; padding: 6px 12px !important; font-size: 13px !important; }
      .fc-button:hover { background-color: #fce7f3 !important; opacity: 0.8; }
      .fc-button-primary:not(:disabled).fc-button-active { background-color: #ec4899 !important; color: white !important; border-color: #ec4899 !important; }
      .fc-more-link { color: #f9a8d4 !important; font-weight: 600; font-size: 11px; }
      .fc-more-link:hover { color: #db2777 !important; }
      .fc-popover { max-height: 260px !important; overflow-y: auto !important; background-color: #fff0f5 !important; border: 1px solid #fbcfe8 !important; border-radius: 8px !important; box-shadow: 0 8px 24px rgba(236,72,153,0.15) !important; }
      .fc-popover-header { background-color: #fce7f3 !important; color: #9d174d !important; padding: 8px 12px !important; font-weight: 700 !important; border-radius: 8px 8px 0 0 !important; }
      .fc-popover-body { padding: 6px !important; overflow-y: auto !important; max-height: 210px !important; }
      .fc-popover-close { color: #f9a8d4 !important; font-size: 16px !important; }
      .fc-popover-close:hover { color: #db2777 !important; }
    `,

    // Recharts tooltip
    tooltipStyle: { backgroundColor: "#fff0f5", border: "1px solid #fbcfe8", borderRadius: "8px", color: "#374151" },
    chartColor: "#ec4899",
    chartColors: ["#ec4899", "#f9a8d4", "#be185d", "#db2777", "#fda4af"],

    tipo: "salon",
  },
};

export function getTema(barberia) {
  return barberia?.tipo_barberia === "salon" ? TEMAS.salon : TEMAS.barberia;
}
