// Mock data para desarrollo - Reemplazar con API real cuando esté lista

export const MOCK_SERVICES = {
  success: true,
  data: {
    services: [
      {
        type: 'internet',
        id: "SRV-INT-100",
        name: 'Básico',
        speed: '5 Mbps',
        monthlyPrice: 300,
        installationPrice: 900,
        recommended: false,
        audience: ['Redes sociales', 'Navegación', 'Videos', 'Tareas', 'Uso cotidiano'],
      },
      {
        type: 'internet',
        id: "SRV-INT-10",
        name: 'Intermedio',
        speed: '10 Mbps',
        monthlyPrice: 350,
        installationPrice: 750,
        recommended: true,
        audience: [
          'Streaming',
          'Varios dispositivos',
          'Uso familiar',
          'Mayor velocidad y estabilidad',
        ],
      },
      {
        type: 'internet',
        id: "SRV-INT-1",
        name: 'Custom',
        speed: '15 Mbps',
        monthlyPrice: 400,
        installationPrice: 650,
        recommended: false,
        audience: [
          'Trabajo en línea',
          'Negocios',
          'Mayor demanda de Internet',
          'Varios dispositivos',
        ],
      },
      {
        type: 'streaming',
         id: "SRV-STR-10",
        name: 'Netflix',
        monthlyPrice: null,
        priceAvailableOnRequest: true,
        logo: '/icons/streaming/netflix.svg',
        platformUrl: 'https://www.netflix.com/mx/',
      },
      {
        type: 'streaming',
          id: "SRV-STR-11",
        name: 'Disney+',
        monthlyPrice: null,
        priceAvailableOnRequest: true,
        logo: '/icons/streaming/disney-plus.svg',
        platformUrl: 'https://www.disneyplus.com/es-mx',
      },
      {
        type: 'streaming',
         id: "SRV-STR-30",
        name: 'Prime Video',
        monthlyPrice: null,
        priceAvailableOnRequest: true,
        logo: '/icons/streaming/prime-video.svg',
        platformUrl: 'https://www.primevideo.com/',
      },
      {
        type: 'streaming',
          id: "SRV-STR-1110",
        name: 'ViX',
        monthlyPrice: null,
        priceAvailableOnRequest: true,
        logo: '/icons/streaming/vix.svg',
        platformUrl: 'https://vix.com/es-es',
      },
    ],
  },
};

export const MOCK_BENEFITS = {
  success: true,
  data: {
    benefits: [
      {
        title: 'Velocidad Garantizada',
        description:
          'Disfruta de velocidades estables y confiables en todo momento. Sin sorpresas, sin caídas.',
        icon: 'https://icons.getbootstrap.com/assets/icons/lightning-fill.svg',
      },
      {
        title: 'Soporte Local 24/7',
        description:
          'Equipo de expertos disponible siempre para resolver tus dudas. Soporte cercano y de confianza.',
        icon: 'https://icons.getbootstrap.com/assets/icons/headset.svg',
      },
      {
        title: 'Instalación Rápida',
        description:
          'Desde tu solicitud hasta conectarte en menos de 48 horas. Proceso ágil y sin complicaciones.',
        icon: 'https://icons.getbootstrap.com/assets/icons/lightning.svg',
      },
      {
        title: 'Precios Transparentes',
        description:
          'Conoce exactamente qué pagas. Sin cargos ocultos, sin sorpresas en la factura.',
        icon: 'https://icons.getbootstrap.com/assets/icons/wallet2.svg',
      },
      {
        title: 'Primer Mes Gratis',
        description:
          'Prueba nuestro servicio sin compromiso. Cancela cuando quieras si no estás satisfecho.',
        icon: 'https://icons.getbootstrap.com/assets/icons/gift.svg',
      },
      {
        title: 'Router Incluido',
        description:
          'Equipo de última tecnología incluido en tu plan. Mantén tu hogar conectado siempre.',
        icon: 'https://icons.getbootstrap.com/assets/icons/wifi.svg',
      },
    ],
  },
};

export const MOCK_STEPS = {
  success: true,
  data: {
    steps: [
      {
        step: 1,
        title: 'Consulta Cobertura',
        description:
          'Verifica si nuestro servicio está disponible en tu zona. Comparte tu ubicación y nosotros confirmamos.',
      },
      {
        step: 2,
        title: 'Elige tu Plan',
        description:
          'Selecciona el plan que mejor se adapte a tus necesidades. Todos incluyen el primer mes gratis.',
      },
      {
        step: 3,
        title: 'Confirma Instalación',
        description:
          'Nuestro equipo te contactará para agendar la instalación en tu hogar o negocio.',
      },
      {
        step: 4,
        title: '¡Conectado!',
        description:
          'Disfruta de internet de alta velocidad. Acceso inmediato a todos tus contenidos favoritos.',
      },
    ],
  },
};

export const MOCK_FAQS = {
  success: true,
  data: {
    faqs: [
      {
        question: '¿Cuáles son los requisitos para contratar?',
        answer:
          'Solo necesitas tener una conexión eléctrica en el punto de instalación. Nuestro equipo se encargará del resto. Puede haber restricciones según tu zona de cobertura.',
      },
      {
        question: '¿Cuánto tiempo tarda la instalación?',
        answer:
          'La instalación típicamente toma entre 1 y 3 horas. Nuestro equipo técnico se presentará en la fecha y hora acordada con todo el equipo necesario.',
      },
      {
        question: '¿Puedo cambiar de plan?',
        answer:
          'Sí, puedes cambiar de plan en cualquier momento. Los cambios surten efecto en el siguiente ciclo de facturación sin cargos adicionales.',
      },
      {
        question: '¿Hay contrato de permanencia?',
        answer:
          'No hay contrato obligatorio. Puedes cancelar tu servicio en cualquier momento con solo 30 días de aviso previo.',
      },
      {
        question: '¿Qué pasa si no hay cobertura en mi zona?',
        answer:
          'Si actualmente no hay cobertura, dejamos registrada tu solicitud. Nuestro equipo te contactará cuando la cobertura llegue a tu zona.',
      },
      {
        question: '¿El router está incluido?',
        answer:
          'Sí, todos nuestros planes incluyen router WiFi de última tecnología. El equipo es nuestro y realizamos mantenimiento sin costo.',
      },
      {
        question: '¿Hay descuentos para negocios?',
        answer:
          'Sí, tenemos planes especiales para empresas con SLA garantizado, IP estática y soporte prioritario. Contáctanos para más detalles.',
      },
      {
        question: '¿Puedo compartir mi internet con mis vecinos?',
        answer:
          'No está permitido según nuestros términos de servicio. El servicio es exclusivo para tu hogar o negocio registrado.',
      },
    ],
  },
};

export const MOCK_CONTACT = {
  success: true,
  data: {
    contact: {
      phone: '+52 871 615 6932',
      whatsapp: '8716156932',
      email: 'contacto@speedlink.mx',
      address: 'Ejido Martha, Mapimi Dgo. 35200, México',
      facebook: 'facebook.com/speedlink',
      instagram: '@speedlink_mx',
      businessHours: {
        weekday: '8:00 AM - 8:00 PM',
        weekend: '9:00 AM - 6:00 PM',
      },
    },
  },
};
