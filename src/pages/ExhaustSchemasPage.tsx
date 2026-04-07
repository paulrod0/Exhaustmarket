import { useState } from 'react'
import { Thermometer, Layers, Info, ChevronRight, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Component {
  id: string
  name: string
  material: string
  temp: string
  description: string
  tip?: string
}

type Layout = 'v8tt' | 'v10na' | 'flat6na' | 'i6tt'

interface CarModel {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  layout: Layout
  color: string
  note?: string
  components: Record<string, Component>
}

// ─── Car Data ─────────────────────────────────────────────────────────────────

const CARS: CarModel[] = [
  {
    id: 'ferrari-488',
    brand: 'Ferrari',
    model: '488 GTB',
    year: '2015–2019',
    engine: 'V8 Biturbo 3.9L',
    power: '670 CV',
    layout: 'v8tt',
    color: '#C8102E',
    note: 'Válvulas activas que modulan el sonido según modo de conducción (Sport / Race)',
    components: {
      manifold_l: { id: 'manifold_l', name: 'Colector Izq.', material: 'Acero inox. 321', temp: '800–900 °C', description: 'Colector 4-en-1 del banco izquierdo. Diseño "short runner" para minimizar la distancia al turbo y mejorar la respuesta transitoria.', tip: 'El diseño compacto reduce el lag del turbo: los gases llegan antes a la turbina.' },
      manifold_r: { id: 'manifold_r', name: 'Colector Der.', material: 'Acero inox. 321', temp: '800–900 °C', description: 'Colector 4-en-1 del banco derecho, simétrico al izquierdo. Garantiza distribución igual de contrapresión en ambos bancos.', tip: 'La simetría perfecta entre bancos es esencial para equilibrar el spool de ambos turbos.' },
      turbo_l: { id: 'turbo_l', name: 'Turbocompresor Izq.', material: 'Inconel / Ni-Cr', temp: '900–1050 °C', description: 'Turbina IHI de geometría fija. La carcasa de Inconel soporta las temperaturas extremas. Gira hasta 200.000 rpm.', tip: 'El Inconel 713C es la única superaleación práctica para estas condiciones de temperatura y vibración.' },
      turbo_r: { id: 'turbo_r', name: 'Turbocompresor Der.', material: 'Inconel / Ni-Cr', temp: '900–1050 °C', description: 'Turbina gemela al izquierdo. Configuración twin-scroll para separar los pulsos de escape y evitar interferencias entre cilindros.', tip: 'El twin-scroll divide el colector en dos canales para mantener la energía de los pulsos de gas separada.' },
      cat_l: { id: 'cat_l', name: 'Catalizador Izq.', material: 'Sustrato cerámico 600 CPSI', temp: '400–700 °C', description: 'Catalizador de tres vías de alta celda (600 CPSI). Convierte CO, HC y NOx cumpliendo Euro 6 con mínima restricción de flujo.', tip: 'Los 600 CPSI (celdas por pulgada cuadrada) permiten mayor área superficial con menos restricción que los estándar de 400 CPSI.' },
      cat_r: { id: 'cat_r', name: 'Catalizador Der.', material: 'Sustrato cerámico 600 CPSI', temp: '400–700 °C', description: 'Catalizador gemelo al izquierdo. Ferrari usa revestimiento de Pd/Rh en lugar de Pt para reducción más eficiente de NOx.', tip: 'La activación del catalizador ocurre a partir de 300 °C. El calentamiento rápido del motor acorta esta fase fría.' },
      xpipe: { id: 'xpipe', name: 'X-Pipe', material: 'Acero inox. 304', temp: '300–500 °C', description: 'Cruza y mezcla los gases de ambos bancos generando presión de extracción más uniforme. Produce el sonido rasposo y agudo característico de los V8 Ferrari.', tip: 'El X-Pipe mejora el par entre 4.000–7.000 rpm versus el H-Pipe. Es la firma acústica del V8 de Ferrari.' },
      muffler: { id: 'muffler', name: 'Silenciador + Válvulas', material: 'Acero inox. + actuadores eléctricos', temp: '200–350 °C', description: 'Silenciador de bypass con válvulas controladas por ECU. En modo Race se abren completamente, reduciendo 40% la contrapresión.', tip: 'Sin las válvulas, el Ferrari 488 superaría los 95 dB en ciudad. Con ellas cerradas baja a 72 dB.' },
      tips: { id: 'tips', name: 'Salidas (×4)', material: 'Acero inox. pulido 316L', temp: '150–250 °C', description: 'Cuatro terminaciones de 80 mm integradas en el difusor. Posición central característica del 488, a diferencia de los competidores con salidas laterales.', tip: 'El acabado pulido espejo resiste la condensación ácida de los gases quemados y evita la corrosión en los bordes.' },
    }
  },
  {
    id: 'lamborghini-huracan',
    brand: 'Lamborghini',
    model: 'Huracán LP610-4',
    year: '2014–2022',
    engine: 'V10 Atmosférico 5.2L',
    power: '610 CV',
    layout: 'v10na',
    color: '#FF8C00',
    note: 'Motor atmosférico de 8.500 rpm. Sin turbos — el escape trabaja bajo presión de extracción pura',
    components: {
      manifold_l: { id: 'manifold_l', name: 'Colector Izq. (5→1)', material: 'Acero inox. 321 + revestimiento cerámico', temp: '850–950 °C', description: 'Colector de 5 tubos de igual longitud (equal-length) para el banco izquierdo del V10. La longitud uniforme garantiza que cada pulso llegue al colector en el momento exacto para la extracción máxima.', tip: 'En un V10 natural, los colectores equal-length son críticos: cada cilindro debe contribuir igual a la extracción. Un mm de diferencia afecta la meseta de par.' },
      manifold_r: { id: 'manifold_r', name: 'Colector Der. (5→1)', material: 'Acero inox. 321 + revestimiento cerámico', temp: '850–950 °C', description: 'Espejo exacto del colector izquierdo. En un motor de alta compresión natural (12,7:1), las temperaturas de escape son más altas que en un turbo.', tip: 'El ángulo en V de 90° del Huracán crea un reto geométrico para los colectores: deben ser más largos y curvos que en un V8.' },
      cat_l: { id: 'cat_l', name: 'Catalizador Izq.', material: 'Sustrato metálico Emitec', temp: '500–800 °C', description: 'Catalizador de sustrato metálico (en lugar de cerámico) para menor masa térmica: se activa antes, reduciendo emisiones en frío.', tip: 'En un motor natural, la temperatura de escape varía más que en un turbo. El sustrato metálico aguanta mejor los ciclos térmicos.' },
      cat_r: { id: 'cat_r', name: 'Catalizador Der.', material: 'Sustrato metálico Emitec', temp: '500–800 °C', description: 'Catalizador derecho de alta celda. Lamborghini usa revestimiento tri-metal (Pt/Pd/Rh) para cumplir Euro 6d sin sacrificar fluidez a altas RPM.', tip: 'A 8.500 rpm, el flujo másico de gases es extremo. El diseño del catalizador prioriza la mínima restricción por encima de la conversión.' },
      collector: { id: 'collector', name: 'Colector Central', material: 'Titanio / Acero 304', temp: '400–600 °C', description: 'Une los flujos de ambos bancos con geometría asimétrica compensada. En el Huracán STO y Performante se usa titanio para ahorrar 7 kg de peso.', tip: 'El Huracán Performante usa un colector de titanio fabricado por impresión 3D, primera vez en la industria en un coche de calle.' },
      muffler: { id: 'muffler', name: 'Silenciador', material: 'Acero inox. 304', temp: '200–400 °C', description: 'Silenciador de cámara de resonancia. Sin válvulas activas en la versión estándar: el volumen de resonancia está calibrado para filtrar frecuencias específicas.', tip: 'El V10 atmosférico del Huracán no necesita válvulas: su nota natural ya cumple los límites sin atenuación adicional.' },
      tips: { id: 'tips', name: 'Salidas (×4)', material: 'Acero inox. con acabado PVD negro', temp: '150–280 °C', description: 'Cuatro terminaciones integradas en el difusor trasero. El acabado PVD negro es más resistente a la oxidación a altas temperaturas que el cromo pulido.', tip: 'El PVD (Physical Vapor Deposition) es un recubrimiento de 2-4 micras que resiste hasta 500 °C sin decoloración.' },
    }
  },
  {
    id: 'porsche-911-gt3',
    brand: 'Porsche',
    model: '911 GT3 (992)',
    year: '2021–presente',
    engine: 'Flat-6 Atmosférico 4.0L',
    power: '510 CV',
    layout: 'flat6na',
    color: '#000000',
    note: 'Motor bóxer central trasero — los colectores salen horizontalmente a ambos lados antes de cruzar al centro',
    components: {
      manifold_l: { id: 'manifold_l', name: 'Colector Izq. (3→1)', material: 'Acero inox. 321 + revestimiento APS', temp: '750–880 °C', description: 'Colector de los 3 cilindros izquierdos del motor bóxer. La configuración horizontal del motor hace que los colectores salgan lateralmente, un reto único vs. motores en V.', tip: 'El flat-6 tiene colectores más cortos que un V-engine equivalente, lo que favorece el flujo a altas RPM (9.000 rpm en el GT3).' },
      manifold_r: { id: 'manifold_r', name: 'Colector Der. (3→1)', material: 'Acero inox. 321 + revestimiento APS', temp: '750–880 °C', description: 'Colector derecho simétrico. El revestimiento APS (Air Plasma Spray) refleja el calor y reduce la transmisión térmica al chasis trasero.', tip: 'El compartimento motor del 911 es muy estrecho. Los ingenieros de Porsche tienen menos de 40 mm de holgura para los colectores.' },
      cat_l: { id: 'cat_l', name: 'Catalizador Izq.', material: 'Cerámica 400 CPSI + Pd/Rh', temp: '450–750 °C', description: 'Catalizador de tres vías con sustrato cerámico de alta durabilidad. Porsche usa 400 CPSI en lugar de 600 para priorizar la durabilidad en uso en pista.', tip: 'El GT3 se usa frecuentemente en circuito donde los catalizadores sufren ciclos térmicos extremos. La durabilidad > máximo flujo.' },
      cat_r: { id: 'cat_r', name: 'Catalizador Der.', material: 'Cerámica 400 CPSI + Pd/Rh', temp: '450–750 °C', description: 'Catalizador simétrico. En el GT3 RS, se sustituye por uno de sustrato metálico más ligero y con mayor celda para la pista.', tip: 'El GT3 RS de circuito usa catalizadores de 600 CPSI metálicos que reducen 15% la restricción vs. los de calle.' },
      hpipe: { id: 'hpipe', name: 'H-Pipe / Balanceador', material: 'Acero inox. 304', temp: '300–500 °C', description: 'El H-Pipe conecta los dos flujos principales de escape antes del silenciador. En el flat-6, produce un sonido más profundo y redondo que el X-Pipe.', tip: 'El H-Pipe produce interferencia constructiva de ondas sonoras a baja frecuencia, el "ronroneo" característico del flat-6 Porsche.' },
      resonator: { id: 'resonator', name: 'Resonador', material: 'Acero inox. 304', temp: '250–400 °C', description: 'Resonador de Helmholtz sintonizado para eliminar la frecuencia de "boom" a 2.000–3.000 rpm sin afectar el sonido a altas RPM.', tip: 'Sin el resonador, el flat-6 produce un zumbido molesto a velocidad de autopista. El resonador actúa como filtro de banda.' },
      muffler: { id: 'muffler', name: 'Silenciador Sport', material: 'Acero inox. + válvulas bypass', temp: '200–350 °C', description: 'En el GT3 el silenciador es optativo con Sport Exhaust (Porsche OE). Las válvulas se activan automáticamente por encima de 4.500 rpm.', tip: 'El Sport Exhaust del GT3 pesa 4 kg menos que el estándar al usar paredes más delgadas y material optimizado.' },
      tips: { id: 'tips', name: 'Salidas (×2)', material: 'Acero inox. pulido', temp: '150–270 °C', description: 'Dos salidas de 90 mm centradas en el difusor trasero. La posición central es una firma estética del GT3 desde el 996.', tip: 'Las salidas circulares del GT3 son más grandes en diámetro que las elípticas del 911 Carrera estándar para reducir contrapresión.' },
    }
  },
  {
    id: 'bmw-m3',
    brand: 'BMW M',
    model: 'M3 Competition (G80)',
    year: '2021–presente',
    engine: 'I6 Biturbo 3.0L S58',
    power: '510 CV',
    layout: 'i6tt',
    color: '#1C69D3',
    note: 'Motor S58 — inline-6 con dos turbos montados directamente en el colector integrado (hot-V inverso)',
    components: {
      manifold: { id: 'manifold', name: 'Colector 6-en-2', material: 'Fundición de hierro / Inox. 321', temp: '750–900 °C', description: 'Colector integrado en la culata que divide los 6 cilindros en dos grupos de 3 para cada turbo. El diseño de "colector dividido" es una innovación del S58 vs. el N55.', tip: 'Al integrar el colector en la culata se reduce la distancia al turbo a <5 cm, eliminando prácticamente el lag.' },
      turbo_l: { id: 'turbo_l', name: 'Turbocompresor Izq.', material: 'Inconel + aleación de Ti', temp: '850–1000 °C', description: 'Turbina Honeywell de geometría variable (VGT). Alimentado por los cilindros 4-5-6. La geometría variable adapta el ángulo de las paletas según caudal y RPM.', tip: 'La geometría variable permite 450 Nm desde 2.650 rpm: el turbo funciona como uno pequeño a bajas RPM y uno grande a altas.' },
      turbo_r: { id: 'turbo_r', name: 'Turbocompresor Der.', material: 'Inconel + aleación de Ti', temp: '850–1000 °C', description: 'Turbina gemela alimentada por cilindros 1-2-3. La configuración twin-turbo en inline-6 es más compacta que en V porque ambos turbos quedan en el mismo lado.', tip: 'El I6 tiene ventaja térmica: todos los cilindros están en línea, sin el cruce de gases calientes de un V-engine.' },
      downpipe: { id: 'downpipe', name: 'Downpipe + Cat', material: 'Acero inox. 304 + sustrato 600 CPSI', temp: '500–750 °C', description: 'Downpipe de diámetro creciente (63→76 mm) con catalizador integrado. El aumento de diámetro progresivo reduce la velocidad del gas suavemente para evitar turbulencias.', tip: 'El downpipe es el componente más modificado en el tuning del S58. Un downpipe "decat" aporta +40 CV pero requiere reprogramación de OBD.' },
      midpipe: { id: 'midpipe', name: 'Mid-Pipe', material: 'Acero inox. 304', temp: '300–450 °C', description: 'Tubo central de diámetro 70 mm que conecta los dos flujos de los downpipes antes del silenciador. Sin resonador ni H-Pipe en el I6 por geometría.', tip: 'El mid-pipe del M3 G80 es más largo que el de generaciones anteriores: el motor está montado más atrás por el cambio de peso 50:50.' },
      muffler: { id: 'muffler', name: 'Silenciador Activo M', material: 'Acero inox. + actuadores vacío', temp: '200–350 °C', description: 'Silenciador de doble cámara con válvulas de bypass controladas por vacío de admisión. En modo M el sonido aumenta 12 dB respecto al modo Confort.', tip: 'BMW usa vacío de admisión (no eléctrico) para las válvulas: sistema más rápido y sin necesidad de actuadores adicionales.' },
      tips: { id: 'tips', name: 'Salidas (×4)', material: 'Cromo brillante / Negro opaco (M Performance)', temp: '150–250 °C', description: 'Cuatro salidas de 90 mm en configuración 2+2 en el difusor. Las salidas externas son ligeramente más pequeñas que las internas por razones de packaging.', tip: 'La versión M Performance usa salidas con acabado negro carbón PVD que resiste la decoloración por calor mejor que el cromo.' },
    }
  },
  {
    id: 'mclaren-720s',
    brand: 'McLaren',
    model: '720S',
    year: '2017–2022',
    engine: 'V8 Biturbo 4.0L M840T',
    power: '720 CV',
    layout: 'v8tt',
    color: '#FF8000',
    note: 'Sistema de escape con salida elevada sobre el motor (estilo F1) para bajar el centro de gravedad',
    components: {
      manifold_l: { id: 'manifold_l', name: 'Colector Izq. (4→1)', material: 'Inconel 625', temp: '900–1000 °C', description: 'Colector de Inconel para el banco izquierdo del M840T. McLaren usa Inconel desde el colector (no solo en el turbo) para soportar las temperaturas del motor de 720 CV.', tip: 'El M840T tiene la mayor densidad de potencia por litro de su clase: 180 CV/L. Las temperaturas de escape son correspondientemente extremas.' },
      manifold_r: { id: 'manifold_r', name: 'Colector Der. (4→1)', material: 'Inconel 625', temp: '900–1000 °C', description: 'Colector derecho gemelo. El ángulo en V de 90° del M840T es el mismo que el Ferrari 458/488, pero la configuración del turbo es diferente (biturbo plano-crankshaft vs. flat-plane).', tip: 'El M840T es un V8 de plano cruzado (cross-plane), lo que produce más par bajo que el flat-plane de Ferrari pero con un carácter sonoro diferente.' },
      turbo_l: { id: 'turbo_l', name: 'Turbocompresor Izq.', material: 'Inconel + titanio', temp: '900–1050 °C', description: 'Turbina doble entrada (twin-scroll) de alta eficiencia. McLaren monta los turbos en la parte superior del motor ("hot-vee") para reducir la longitud de colectores.', tip: 'Montar los turbos en el "hot-vee" (entre los bancos del V8) acorta los colectores y mejora el spool, pero complica enormemente el acceso para mantenimiento.' },
      turbo_r: { id: 'turbo_r', name: 'Turbocompresor Der.', material: 'Inconel + titanio', temp: '900–1050 °C', description: 'Turbo gemelo del lado derecho. La posición elevada de los turbos permite que el escape salga también elevado, justo por encima del motor y detrás del conductor.', tip: 'La salida de escape elevada del 720S libera el espacio en el difusor trasero para un mayor efecto suelo y downforce.' },
      cat_l: { id: 'cat_l', name: 'Catalizador Izq.', material: 'Sustrato metálico 400 CPSI', temp: '400–700 °C', description: 'Catalizador de sustrato metálico de alta resistencia. La posición elevada del escape significa que los catalizadores también están en posición inusual, dentro del monocasco de carbono.', tip: 'El acceso a los catalizadores del 720S requiere retirar el motor. McLaren recomienda su revisión cada 30.000 km por esta razón.' },
      cat_r: { id: 'cat_r', name: 'Catalizador Der.', material: 'Sustrato metálico 400 CPSI', temp: '400–700 °C', description: 'Catalizador derecho. El calor generado en esta posición se gestiona con escudos térmicos de fibra cerámica para proteger el monocasco de carbono.', tip: 'El monocasco de fibra de carbono del McLaren es sensible al calor. Los escudos térmicos son críticos para no delaminar el material.' },
      xpipe: { id: 'xpipe', name: 'X-Pipe Elevado', material: 'Titanio grado 5', temp: '300–500 °C', description: 'X-Pipe de titanio situado en la parte trasera-alta del motor. La elección de titanio reduce peso y transfiere menos calor al chasis trasero.', tip: 'El X-Pipe de titanio del 720S pesa 1,8 kg vs. 3,2 kg de acero inoxidable equivalente. Cada kilo aquí es kilogramo de masa no suspendida.' },
      muffler: { id: 'muffler', name: 'Silenciador + Válvulas', material: 'Titanio + actuadores eléctricos', temp: '200–350 °C', description: 'Silenciador de titanio con válvulas activas. Toda la parte posterior del escape en el 720S es de titanio para bajar el centro de gravedad al máximo.', tip: 'El sistema de escape completo del 720S en titanio pesa 12 kg menos que el de acero. Eso equivale a llevar siempre el depósito un cuarto menos lleno.' },
      tips: { id: 'tips', name: 'Salidas (×2+2)', material: 'Titanio con PVD oscuro', temp: '200–300 °C', description: 'Cuatro salidas con acabado PVD oscuro. La posición más elevada vs. competidores es característica del diseño "high-exit exhaust" del 720S.', tip: 'Las salidas del 720S están a 180 mm del suelo, frente a los 80-100 mm de sus competidores. Esto permite un difusor más limpio aerodinámicamente.' },
    }
  },
  {
    id: 'amg-gt',
    brand: 'Mercedes-AMG',
    model: 'GT 63 S',
    year: '2019–presente',
    engine: 'V8 Biturbo 4.0L M177',
    power: '639 CV',
    layout: 'v8tt',
    color: '#333333',
    note: 'Sistema AMG Performance Exhaust con modo "Crackling" programado — antilag acústico en modo Pista',
    components: {
      manifold_l: { id: 'manifold_l', name: 'Colector Izq.', material: 'Fundición de acero + inox. 321', temp: '800–920 °C', description: 'Colector en fundición integrado en la culata. AMG combina fundición (más resistente) con acero inox. en los primarios para gestionar las temperaturas del M177 de alta compresión.', tip: 'El M177 tiene los turbos "hot-vee" igual que el McLaren pero con geometría de V de 90°. Los colectores son más cortos pero el routing más complejo.' },
      manifold_r: { id: 'manifold_r', name: 'Colector Der.', material: 'Fundición de acero + inox. 321', temp: '800–920 °C', description: 'Colector del banco derecho. AMG usa una configuración de colector 4-en-2-en-1 para el M177, a diferencia del 4-en-1 directo de Ferrari.', tip: 'El 4-en-2-en-1 produce más par a media gama pero algo menos de potencia punta vs. el 4-en-1. AMG prioriza la usabilidad diaria.' },
      turbo_l: { id: 'turbo_l', name: 'Turbocompresor Izq.', material: 'Inconel + aleación de Al', temp: '850–1000 °C', description: 'Turbina IHI twin-scroll en posición hot-vee. El M177 usa turbos más pequeños que el M178 (AMG GT Coupé) para mejor respuesta en un V8 de uso diario.', tip: 'El GT 63 S usa un V8 biturbo más orientado al turismo que el GT puro de dos plazas. Los turbos son ligeramente más grandes en caudal pero con menor presión máxima.' },
      turbo_r: { id: 'turbo_r', name: 'Turbocompresor Der.', material: 'Inconel + aleación de Al', temp: '850–1000 °C', description: 'Turbo derecho gemelo. La gestión electrónica del boost AMG permite desequilibrar el boost entre bancos para optimizar la combustión cilindro a cilindro.', tip: 'AMG usa control de boost cilindro-a-cilindro mediante sensores de presión individuales, algo que Ferrari introdujo en el 296 GTB.' },
      cat_l: { id: 'cat_l', name: 'Catalizador Izq.', material: 'Cerámica 400 CPSI (Euro 6d)', temp: '400–700 °C', description: 'Catalizador de tres vías certificado Euro 6d-TEMP. El GT 63 S cumple también con las normativas CARB de California gracias a la química de revestimiento de Umicore.', tip: 'El revestimiento de Umicore usa una proporción Pd:Rh de 5:1, optimizada para el perfil de temperatura del M177 que raramente supera los 6.000 rpm en uso normal.' },
      cat_r: { id: 'cat_r', name: 'Catalizador Der.', material: 'Cerámica 400 CPSI (Euro 6d)', temp: '400–700 °C', description: 'Catalizador derecho. AMG aplica un recubrimiento de zeolita adicional para la retención de HC durante el arranque en frío, cuando el catalizador aún no ha alcanzado temperatura.', tip: 'La zeolita actúa como trampa de HC: retiene los hidrocarburos no quemados del arranque hasta que el catalizador se activa y los destruye.' },
      xpipe: { id: 'xpipe', name: 'X-Pipe AMG', material: 'Acero inox. 304', temp: '300–480 °C', description: 'X-Pipe de AMG con compensación de longitudes para el motor M177 de cilindrada 4.0L. Diseñado específicamente para el sonido "burble" característico de AMG.', tip: 'AMG afina el X-Pipe en cámara anecoica durante cientos de horas para conseguir el timbre específico de marca sin comprometer la potencia.' },
      muffler: { id: 'muffler', name: 'AMG Performance Exhaust', material: 'Acero inox. + actuadores eléctricos', temp: '200–350 °C', description: 'Sistema de escape activo con modo "Crackling" en modo Pista. La ECU produce retardo de encendido selectivo para generar los disparos acústicos en aceleración y desaceleración.', tip: 'Los disparos ("cracks") se generan inyectando combustible extra en la postcombustión. No es un defecto mecánico sino una función programada de la ECU.' },
      tips: { id: 'tips', name: 'Salidas (×4)', material: 'Cromo cepillado / Negro PVD', temp: '150–260 °C', description: 'Cuatro salidas trapezoidales en el difusor trasero. La forma trapezoidal es una firma estética de AMG desde el W205. Diámetro efectivo equivalente a 85 mm circular.', tip: 'Las salidas trapezoidales de AMG tienen un origen funcional: permiten mayor sección de paso con menor altura visible desde detrás del vehículo.' },
    }
  },
]

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────

const BOX = { rx: 6, ry: 6 }

function V8ttDiagram({ selected, onSelect, color }: {
  selected: string | null
  onSelect: (id: string) => void
  color: string
}) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape V8 biturbo">
      {/* Background */}
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE</text>

      {/* ── Manifold L ── */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="20" y="40" width="110" height="50" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="75" y="60" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector</text>
        <text x="75" y="74" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>Izq. 4→1</text>
      </g>
      {/* Manifold R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="20" y="190" width="110" height="50" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="75" y="210" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector</text>
        <text x="75" y="224" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>Der. 4→1</text>
      </g>

      {/* Engine icon */}
      <rect x="2" y="115" width="14" height="50" fill="#D2D2D7" rx="3" />
      <line x1="2" y1="125" x2="16" y2="125" stroke="#C7C7CC" strokeWidth="1" />
      <line x1="2" y1="135" x2="16" y2="135" stroke="#C7C7CC" strokeWidth="1" />
      <line x1="2" y1="145" x2="16" y2="145" stroke="#C7C7CC" strokeWidth="1" />
      <line x1="2" y1="155" x2="16" y2="155" stroke="#C7C7CC" strokeWidth="1" />

      {/* Connector lines manifold→turbo */}
      <line x1="130" y1="65" x2="185" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="130" y1="215" x2="185" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Turbo L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_l')}>
        <ellipse cx="215" cy="65" rx="28" ry="22" fill={sel('turbo_l')} stroke={str('turbo_l')} strokeWidth="1.5" />
        <text x="215" y="61" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_l')}>Turbo</text>
        <text x="215" y="73" textAnchor="middle" fontSize="8" fill={txt('turbo_l')}>Izq.</text>
      </g>
      {/* Turbo R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_r')}>
        <ellipse cx="215" cy="215" rx="28" ry="22" fill={sel('turbo_r')} stroke={str('turbo_r')} strokeWidth="1.5" />
        <text x="215" y="211" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_r')}>Turbo</text>
        <text x="215" y="223" textAnchor="middle" fontSize="8" fill={txt('turbo_r')}>Der.</text>
      </g>

      {/* Connector turbo→cat */}
      <line x1="243" y1="65" x2="290" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="243" y1="215" x2="290" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Cat L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="290" y="44" width="90" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="335" y="61" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat. Izq.</text>
        <text x="335" y="75" textAnchor="middle" fontSize="8" fill={txt('cat_l')}>3 vías</text>
      </g>
      {/* Cat R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="290" y="194" width="90" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="335" y="211" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat. Der.</text>
        <text x="335" y="225" textAnchor="middle" fontSize="8" fill={txt('cat_r')}>3 vías</text>
      </g>

      {/* Connector cat→xpipe */}
      <line x1="380" y1="65" x2="440" y2="105" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="380" y1="215" x2="440" y2="175" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* X-Pipe */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('xpipe')}>
        <rect x="440" y="110" width="90" height="60" fill={sel('xpipe')} stroke={str('xpipe')} strokeWidth="1.5" {...BOX} />
        {/* X cross lines */}
        <line x1="450" y1="120" x2="520" y2="160" stroke={selected === 'xpipe' ? 'rgba(255,255,255,0.5)' : '#C7C7CC'} strokeWidth="1" />
        <line x1="520" y1="120" x2="450" y2="160" stroke={selected === 'xpipe' ? 'rgba(255,255,255,0.5)' : '#C7C7CC'} strokeWidth="1" />
        <text x="485" y="138" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('xpipe')}>X-Pipe</text>
      </g>

      {/* Connector xpipe→muffler */}
      <line x1="530" y1="140" x2="600" y2="140" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Muffler */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="600" y="105" width="110" height="70" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="655" y="133" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="655" y="148" textAnchor="middle" fontSize="8" fill={txt('muffler')}>+ Válvulas</text>
        {/* valve icons */}
        <line x1="625" y1="158" x2="625" y2="165" stroke={txt('muffler')} strokeWidth="1.5" />
        <line x1="685" y1="158" x2="685" y2="165" stroke={txt('muffler')} strokeWidth="1.5" />
      </g>

      {/* Connector muffler→tips */}
      <line x1="710" y1="128" x2="760" y2="110" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="710" y1="152" x2="760" y2="170" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* Tips */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="760" y="95" width="80" height="30" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="15" ry="15" />
        <rect x="760" y="155" width="80" height="30" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="15" ry="15" />
        <text x="800" y="115" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('tips')}>Salida ×2</text>
        <text x="800" y="175" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('tips')}>Salida ×2</text>
      </g>

      {/* Flow arrows */}
      <text x="160" y="52" fontSize="9" fill="#C7C7CC">→</text>
      <text x="260" y="52" fontSize="9" fill="#C7C7CC">→</text>
      <text x="160" y="202" fontSize="9" fill="#C7C7CC">→</text>
      <text x="260" y="202" fontSize="9" fill="#C7C7CC">→</text>
      <text x="570" y="136" fontSize="9" fill="#C7C7CC">→</text>

      {/* Legend */}
      <text x="16" y="265" fontSize="9" fill="#86868B">Toca cada componente para ver detalles técnicos</text>
    </svg>
  )
}

function V10naDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape V10 natural">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE</text>

      {/* Engine rect */}
      <rect x="2" y="100" width="16" height="80" fill="#D2D2D7" rx="3" />
      {[110,120,130,140,150,160,170].map(y => (
        <line key={y} x1="2" y1={y} x2="18" y2={y} stroke="#C7C7CC" strokeWidth="0.8" />
      ))}

      {/* Manifold L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="20" y="40" width="110" height="50" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="75" y="60" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="75" y="74" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>5→1 equal-length</text>
      </g>
      {/* Manifold R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="20" y="190" width="110" height="50" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="75" y="210" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="75" y="224" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>5→1 equal-length</text>
      </g>

      <line x1="130" y1="65" x2="220" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="130" y1="215" x2="220" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Cat L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="220" y="44" width="90" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="265" y="61" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat. Izq.</text>
        <text x="265" y="75" textAnchor="middle" fontSize="8" fill={txt('cat_l')}>metálico</text>
      </g>
      {/* Cat R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="220" y="194" width="90" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="265" y="211" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat. Der.</text>
        <text x="265" y="225" textAnchor="middle" fontSize="8" fill={txt('cat_r')}>metálico</text>
      </g>

      <line x1="310" y1="65" x2="370" y2="105" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="310" y1="215" x2="370" y2="175" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* Collector central */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('collector')}>
        <rect x="370" y="108" width="100" height="64" fill={sel('collector')} stroke={str('collector')} strokeWidth="1.5" {...BOX} />
        <text x="420" y="135" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('collector')}>Colector</text>
        <text x="420" y="150" textAnchor="middle" fontSize="9" fill={txt('collector')}>Central Ti</text>
      </g>

      <line x1="470" y1="140" x2="540" y2="140" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Muffler */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="540" y="108" width="110" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="595" y="133" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="595" y="150" textAnchor="middle" fontSize="8" fill={txt('muffler')}>cámara resonancia</text>
      </g>

      <line x1="650" y1="128" x2="710" y2="110" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="650" y1="140" x2="710" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="650" y1="152" x2="710" y2="170" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* Tips ×4 */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        {[95, 125, 155, 185].map((y, i) => (
          <rect key={i} x="710" y={y} width="70" height="22" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="11" ry="11" />
        ))}
        <text x="745" y="150" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('tips')}>×4</text>
      </g>

      <text x="16" y="265" fontSize="9" fill="#86868B">Toca cada componente para ver detalles técnicos</text>
    </svg>
  )
}

function Flat6naDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape Flat-6 atmosférico">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE</text>

      <rect x="2" y="110" width="16" height="60" fill="#D2D2D7" rx="3" />

      {/* Manifold L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="22" y="40" width="110" height="50" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="77" y="60" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="77" y="74" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>3→1 APS</text>
      </g>
      {/* Manifold R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="22" y="190" width="110" height="50" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="77" y="210" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="77" y="224" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>3→1 APS</text>
      </g>

      <line x1="132" y1="65" x2="210" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="132" y1="215" x2="210" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Cat L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="210" y="44" width="90" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="255" y="61" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat. Izq.</text>
        <text x="255" y="75" textAnchor="middle" fontSize="8" fill={txt('cat_l')}>400 CPSI</text>
      </g>
      {/* Cat R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="210" y="194" width="90" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="255" y="211" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat. Der.</text>
        <text x="255" y="225" textAnchor="middle" fontSize="8" fill={txt('cat_r')}>400 CPSI</text>
      </g>

      <line x1="300" y1="65" x2="360" y2="110" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="300" y1="215" x2="360" y2="170" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* H-Pipe */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('hpipe')}>
        <rect x="360" y="108" width="80" height="64" fill={sel('hpipe')} stroke={str('hpipe')} strokeWidth="1.5" {...BOX} />
        <line x1="380" y1="120" x2="420" y2="120" stroke={selected === 'hpipe' ? 'rgba(255,255,255,0.5)' : '#C7C7CC'} strokeWidth="2" />
        <line x1="380" y1="158" x2="420" y2="158" stroke={selected === 'hpipe' ? 'rgba(255,255,255,0.5)' : '#C7C7CC'} strokeWidth="2" />
        <line x1="400" y1="120" x2="400" y2="158" stroke={selected === 'hpipe' ? 'rgba(255,255,255,0.5)' : '#C7C7CC'} strokeWidth="1.5" />
        <text x="400" y="148" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('hpipe')}>H-Pipe</text>
      </g>

      <line x1="440" y1="140" x2="500" y2="140" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Resonator */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('resonator')}>
        <rect x="500" y="118" width="80" height="44" fill={sel('resonator')} stroke={str('resonator')} strokeWidth="1.5" {...BOX} />
        <text x="540" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('resonator')}>Resonador</text>
        <text x="540" y="150" textAnchor="middle" fontSize="8" fill={txt('resonator')}>Helmholtz</text>
      </g>

      <line x1="580" y1="140" x2="620" y2="140" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Muffler */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="620" y="108" width="100" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="670" y="133" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="670" y="148" textAnchor="middle" fontSize="8" fill={txt('muffler')}>Sport bypass</text>
      </g>

      <line x1="720" y1="128" x2="775" y2="118" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="720" y1="152" x2="775" y2="162" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* Tips ×2 */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="775" y="102" width="70" height="26" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="13" ry="13" />
        <rect x="775" y="152" width="70" height="26" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="13" ry="13" />
        <text x="810" y="119" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('tips')}>Salida ×2</text>
        <text x="810" y="169" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('tips')}>90 mm</text>
      </g>

      <text x="16" y="265" fontSize="9" fill="#86868B">Toca cada componente para ver detalles técnicos</text>
    </svg>
  )
}

function I6ttDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'
  const labels = [['Colector', '6→2'], ['Turbo L', 'cil. 4-5-6'], ['Turbo R', 'cil. 1-2-3'], ['Downpipe', '+ Cat'], ['Mid-Pipe', '70 mm'], ['Silenciador', 'Activo M'], ['Salidas', '×4']]
  const xPositions = [40, 150, 150, 280, 400, 530, 680]
  const yPositions = [120, 60, 190, 120, 120, 120, 120]

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape I6 biturbo">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — INLINE 6</text>

      {/* Engine */}
      <rect x="2" y="100" width="34" height="80" fill="#D2D2D7" rx="4" />
      <text x="19" y="138" textAnchor="middle" fontSize="8" fill="#86868B" transform="rotate(-90 19 138)">I6</text>
      {[110,120,130,140,150,160,170].map(y => (
        <line key={y} x1="2" y1={y} x2="36" y2={y} stroke="#C7C7CC" strokeWidth="0.6" />
      ))}

      {/* Manifold */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold')}>
        <rect x={xPositions[0]} y={yPositions[0] - 22} width="100" height="44" fill={sel('manifold')} stroke={str('manifold')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[0] + 50} y={yPositions[0] - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold')}>{labels[0][0]}</text>
        <text x={xPositions[0] + 50} y={yPositions[0] + 10} textAnchor="middle" fontSize="9" fill={txt('manifold')}>{labels[0][1]}</text>
      </g>

      {/* Arrows manifold→turbos */}
      <line x1="36" y1="140" x2={xPositions[0]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={xPositions[0] + 100} y1="105" x2={xPositions[1]} y2="82" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={xPositions[0] + 100} y1="135" x2={xPositions[2]} y2="208" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Turbo L */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_l')}>
        <ellipse cx={xPositions[1] + 30} cy={yPositions[1]} rx="30" ry="22" fill={sel('turbo_l')} stroke={str('turbo_l')} strokeWidth="1.5" />
        <text x={xPositions[1] + 30} y={yPositions[1] - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_l')}>Turbo L</text>
        <text x={xPositions[1] + 30} y={yPositions[1] + 8} textAnchor="middle" fontSize="8" fill={txt('turbo_l')}>VGT</text>
      </g>
      {/* Turbo R */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_r')}>
        <ellipse cx={xPositions[2] + 30} cy={yPositions[2]} rx="30" ry="22" fill={sel('turbo_r')} stroke={str('turbo_r')} strokeWidth="1.5" />
        <text x={xPositions[2] + 30} y={yPositions[2] - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_r')}>Turbo R</text>
        <text x={xPositions[2] + 30} y={yPositions[2] + 8} textAnchor="middle" fontSize="8" fill={txt('turbo_r')}>VGT</text>
      </g>

      {/* turbos→downpipe */}
      <line x1={xPositions[1] + 60} y1={yPositions[1]} x2={xPositions[3]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1={xPositions[2] + 60} y1={yPositions[2]} x2={xPositions[3]} y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* Downpipe */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('downpipe')}>
        <rect x={xPositions[3]} y={yPositions[3] - 32} width="100" height="64" fill={sel('downpipe')} stroke={str('downpipe')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[3] + 50} y={yPositions[3] - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('downpipe')}>{labels[3][0]}</text>
        <text x={xPositions[3] + 50} y={yPositions[3] + 4} textAnchor="middle" fontSize="9" fill={txt('downpipe')}>{labels[3][1]}</text>
      </g>

      {/* downpipe→midpipe */}
      <line x1={xPositions[3] + 100} y1="120" x2={xPositions[4]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Mid-pipe */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('midpipe')}>
        <rect x={xPositions[4]} y={yPositions[4] - 22} width="100" height="44" fill={sel('midpipe')} stroke={str('midpipe')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[4] + 50} y={yPositions[4] - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('midpipe')}>{labels[4][0]}</text>
        <text x={xPositions[4] + 50} y={yPositions[4] + 10} textAnchor="middle" fontSize="9" fill={txt('midpipe')}>{labels[4][1]}</text>
      </g>

      <line x1={xPositions[4] + 100} y1="120" x2={xPositions[5]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Muffler */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x={xPositions[5]} y={yPositions[5] - 32} width="110" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[5] + 55} y={yPositions[5] - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>{labels[5][0]}</text>
        <text x={xPositions[5] + 55} y={yPositions[5] + 4} textAnchor="middle" fontSize="8" fill={txt('muffler')}>{labels[5][1]}</text>
      </g>

      <line x1={xPositions[5] + 110} y1="110" x2={xPositions[6]} y2="100" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1={xPositions[5] + 110} y1="120" x2={xPositions[6]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1={xPositions[5] + 110} y1="130" x2={xPositions[6]} y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1={xPositions[5] + 110} y1="138" x2={xPositions[6]} y2="158" stroke="#C7C7CC" strokeWidth="1.5" />

      {/* Tips */}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        {[92, 112, 132, 150].map((y, i) => (
          <rect key={i} x={xPositions[6]} y={y} width="68" height="18" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="9" ry="9" />
        ))}
        <text x={xPositions[6] + 34} y="165" textAnchor="middle" fontSize="8" fontWeight="600" fill={txt('tips')}>×4 trapezoidal</text>
      </g>

      <text x="16" y="265" fontSize="9" fill="#86868B">Toca cada componente para ver detalles técnicos</text>
    </svg>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExhaustSchemasPage() {
  const [selectedCarId, setSelectedCarId] = useState('ferrari-488')
  const [selectedBrand, setSelectedBrand] = useState('Ferrari')
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

  const brands = [...new Set(CARS.map(c => c.brand))]
  const carsOfBrand = CARS.filter(c => c.brand === selectedBrand)
  const car = CARS.find(c => c.id === selectedCarId) ?? CARS[0]
  const component = selectedComponent ? car.components[selectedComponent] : null

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand)
    const first = CARS.find(c => c.brand === brand)
    if (first) setSelectedCarId(first.id)
    setSelectedComponent(null)
  }

  const handleCarSelect = (id: string) => {
    setSelectedCarId(id)
    setSelectedComponent(null)
  }

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '80px' }}>

      {/* Header */}
      <div className="text-center" style={{ marginBottom: '48px' }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>
          Esquemas Interactivos
        </h1>
        <p className="text-body-large" style={{ color: '#6E6E73', maxWidth: '600px', margin: '0 auto' }}>
          Sistemas de escape de alta gama explicados componente a componente.
          Toca cualquier parte del esquema para ver los detalles técnicos.
        </p>
      </div>

      {/* Brand selector */}
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ marginBottom: '20px' }}>
        {brands.map(brand => (
          <button
            key={brand}
            onClick={() => handleBrandSelect(brand)}
            style={{
              padding: '8px 20px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: selectedBrand === brand ? '#1D1D1F' : '#F5F5F7',
              color: selectedBrand === brand ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            {brand}
          </button>
        ))}
      </div>

      {/* Model selector */}
      {carsOfBrand.length > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap" style={{ marginBottom: '28px' }}>
          {carsOfBrand.map(c => (
            <button
              key={c.id}
              onClick={() => handleCarSelect(c.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '980px',
                fontSize: '13px',
                fontWeight: 400,
                border: `1px solid ${selectedCarId === c.id ? c.color : '#D2D2D7'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: selectedCarId === c.id ? c.color : '#FFFFFF',
                color: selectedCarId === c.id ? '#FFFFFF' : '#1D1D1F',
              }}
            >
              {c.model}
            </button>
          ))}
        </div>
      )}

      {/* Car info strip */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #F2F2F7',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <p style={{ fontSize: '19px', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
            <span style={{ color: car.color }}>●</span> {car.brand} {car.model}
          </p>
          <p style={{ fontSize: '13px', color: '#86868B', margin: '2px 0 0' }}>{car.year}</p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#86868B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Motor</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F', margin: '2px 0 0' }}>{car.engine}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#86868B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Potencia</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F', margin: '2px 0 0' }}>{car.power}</p>
          </div>
        </div>
        {car.note && (
          <div
            style={{
              backgroundColor: `${car.color}12`,
              border: `1px solid ${car.color}30`,
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#1D1D1F',
              maxWidth: '320px',
              lineHeight: 1.4,
            }}
          >
            <Info size={12} style={{ display: 'inline', marginRight: '4px', color: car.color }} />
            {car.note}
          </div>
        )}
      </div>

      {/* Diagram + detail panel side by side on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: component ? '1fr 340px' : '1fr', gap: '16px', alignItems: 'start' }}>

        {/* SVG Diagram */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #F2F2F7',
            borderRadius: '18px',
            padding: '20px',
            overflow: 'hidden',
          }}
        >
          {car.layout === 'v8tt' && (
            <V8ttDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />
          )}
          {car.layout === 'v10na' && (
            <V10naDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />
          )}
          {car.layout === 'flat6na' && (
            <Flat6naDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />
          )}
          {car.layout === 'i6tt' && (
            <I6ttDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />
          )}

          {/* Component pills legend */}
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.values(car.components).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedComponent(c.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '980px',
                  fontSize: '12px',
                  border: `1px solid ${selectedComponent === c.id ? car.color : '#E5E5EA'}`,
                  cursor: 'pointer',
                  backgroundColor: selectedComponent === c.id ? car.color : '#FFFFFF',
                  color: selectedComponent === c.id ? '#FFFFFF' : '#6E6E73',
                  transition: 'all 0.15s ease',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {component && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${car.color}30`,
              borderRadius: '18px',
              overflow: 'hidden',
              position: 'sticky',
              top: '80px',
            }}
          >
            {/* Header */}
            <div
              style={{
                backgroundColor: car.color,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                {component.name}
              </p>
              <button
                onClick={() => setSelectedComponent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex' }}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#F5F5F7', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Thermometer size={12} style={{ color: '#FF3B30' }} />
                    <span style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Temperatura</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>{component.temp}</p>
                </div>
                <div style={{ backgroundColor: '#F5F5F7', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Layers size={12} style={{ color: '#0071E3' }} />
                    <span style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Material</span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#1D1D1F', margin: 0, lineHeight: 1.3 }}>{component.material}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#3A3A3C', margin: 0 }}>
                  {component.description}
                </p>
              </div>

              {/* Pro tip */}
              {component.tip && (
                <div
                  style={{
                    backgroundColor: `${car.color}0D`,
                    border: `1px solid ${car.color}25`,
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  <p style={{ fontSize: '11px', fontWeight: 600, color: car.color, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dato técnico
                  </p>
                  <p style={{ fontSize: '12px', color: '#1D1D1F', margin: 0, lineHeight: 1.5 }}>
                    {component.tip}
                  </p>
                </div>
              )}

              {/* Navigate between components */}
              <div style={{ borderTop: '1px solid #F2F2F7', paddingTop: '12px' }}>
                <p style={{ fontSize: '11px', color: '#86868B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Otros componentes</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Object.values(car.components).filter(c => c.id !== component.id).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedComponent(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F5F5F7' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <span style={{ fontSize: '13px', color: '#1D1D1F' }}>{c.name}</span>
                      <ChevronRight size={14} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty state hint */}
      {!component && (
        <div
          className="text-center"
          style={{ marginTop: '20px', padding: '24px', color: '#86868B', fontSize: '14px' }}
        >
          Toca un componente en el esquema o en las pills para ver sus detalles técnicos
        </div>
      )}
    </div>
  )
}
