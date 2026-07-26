export interface SpeedlinkPlan {
  readonly id: string;
  readonly name: string;
  readonly speed: string;
  readonly monthlyPrice: number;
  readonly installationPrice: number;
  readonly recommended?: boolean;
  readonly audience: ReadonlyArray<string>;
}

export const SPEEDLINK_PLANS: ReadonlyArray<SpeedlinkPlan> = [
  {
    id: 'basico',
    name: 'Básico',
    speed: '5 Mbps',
    monthlyPrice: 300,
    installationPrice: 1000,
    audience: ['Redes sociales', 'Navegación', 'Videos', 'Tareas', 'Uso cotidiano'],
  },
  {
    id: 'intermedio',
    name: 'Intermedio',
    speed: '10 Mbps',
    monthlyPrice: 350,
    installationPrice: 900,
    recommended: true,
    audience: ['Streaming', 'Varios dispositivos', 'Uso familiar', 'Mayor velocidad y estabilidad'],
  },
  {
    id: 'custom',
    name: 'Custom',
    speed: '15 Mbps',
    monthlyPrice: 400,
    installationPrice: 800,
    audience: ['Trabajo en línea', 'Negocios', 'Mayor demanda de Internet', 'Varios dispositivos'],
  },
];

export interface SpeedlinkBenefit {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export const SPEEDLINK_BENEFITS: ReadonlyArray<SpeedlinkBenefit> = [
  {
    icon: '/icons/dashboard/fi-sr-star.svg',
    title: 'Internet estable',
    description: 'Conectividad para las actividades diarias de tu hogar.',
  },
  {
    icon: '/icons/dashboard/fi-sr-badge.svg',
    title: 'Planes accesibles',
    description: 'Opciones de Internet de acuerdo con diferentes necesidades y presupuestos.',
  },
  {
    icon: '/icons/settings/fi-rr-comments.svg',
    title: 'Soporte técnico',
    description: 'Atención cuando existe algún inconveniente con el servicio.',
  },
  {
    icon: '/icons/ui/fi-br-chat-arrow-grow.svg',
    title: 'Atención cercana',
    description: 'Comunicación directa con el equipo SpeedLink.',
  },
  {
    icon: '/icons/settings/fi-rr-map-marker-home.svg',
    title: 'Instalación',
    description: 'El equipo realiza la instalación necesaria para conectar al cliente al servicio.',
  },
];

export interface SpeedlinkStep {
  readonly step: number;
  readonly title: string;
  readonly description: string;
}

export const SPEEDLINK_STEPS: ReadonlyArray<SpeedlinkStep> = [
  { step: 1, title: 'Consulta cobertura', description: 'Indícanos dónde necesitas el servicio.' },
  {
    step: 2,
    title: 'Elige tu plan',
    description: 'Selecciona la opción que mejor se adapte a tus necesidades.',
  },
  {
    step: 3,
    title: 'Agenda tu instalación',
    description: 'El equipo coordina la instalación del servicio.',
  },
  { step: 4, title: 'Conéctate', description: 'Disfruta tu servicio de Internet SpeedLink.' },
];

export interface SpeedlinkFaq {
  readonly question: string;
  readonly answer: string;
}

export const SPEEDLINK_FAQS: ReadonlyArray<SpeedlinkFaq> = [
  {
    question: '¿Cuánto cuesta el servicio?',
    answer: 'SpeedLink cuenta actualmente con planes desde $300 MXN mensuales.',
  },
  {
    question: '¿Cuánto cuesta la instalación?',
    answer:
      'El precio depende del plan seleccionado: Básico $1,000 MXN, Intermedio $900 MXN, Custom $800 MXN.',
  },
  {
    question: '¿El primer mes es gratis?',
    answer: 'Sí. Actualmente los planes incluyen el primer mes gratis.',
  },
  {
    question: '¿Cómo sé si hay cobertura en mi zona?',
    answer:
      'Puedes enviar una solicitud desde la sección de cobertura para que SpeedLink pueda revisar la disponibilidad.',
  },
  {
    question: '¿Qué hago si tengo problemas con mi Internet?',
    answer:
      'Puedes contactar a soporte o iniciar sesión para acceder a las opciones disponibles para clientes.',
  },
  {
    question: '¿Puedo cambiar mi plan?',
    answer:
      'Sí. Los clientes pueden solicitar un cambio de plan. El proceso puede tardar hasta aproximadamente 24 horas y, una vez confirmado, el nuevo monto se reflejará en el siguiente recibo correspondiente.',
  },
];

export interface SpeedlinkContact {
  readonly phone: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly address: string;
  readonly facebook: string;
  readonly instagram: string;
}

// Phone and email are real (provided by SpeedLink). Address and social links are
// not available yet — keep them as clearly-marked placeholders, do not invent values.
export const SPEEDLINK_CONTACT: SpeedlinkContact = {
  phone: '871 615 6932',
  whatsapp: '8716156932',
  email: 'speadinternetmd@gmail.com',
  address: '[Dirección pendiente de confirmar]',
  facebook: '[Facebook pendiente de confirmar]',
  instagram: '[Instagram pendiente de confirmar]',
};
