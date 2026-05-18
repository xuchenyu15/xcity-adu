import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, TrendingUp, Clock } from 'lucide-react';
import robotImg from 'figma:asset/8562a27bed9906dab1faaeb2d521cae307439941.png';
import houseImg from 'figma:asset/077652de06cd2302b57c0bf80ad21e8224321977.png';
import solarImg from 'figma:asset/84c625dc5f483822177a9b93a7b03fbd81e5b58b.png';
import rentalImg from 'figma:asset/bb7733e1608fd5c79454bf43e5a9012e3cf1644e.png';
import freeBuildImg from 'figma:asset/90e704a79d3ca6f4ea70f8209d1b4ead4ad21f70.png';

export function BrandFeatures() {
  const features = [
    {
      tag: 'A factory-built ADU system',
      title: 'SYSTEMIZED PREFAB PLATFORM',
      description: 'Built on the XHOME Flex Series, our ADUs combine factory production with thoughtful architectural design, supported by automation and precision manufacturing. Complexity is resolved before anything reaches the site, resulting in predictable cost, dependable timelines, and consistent outcomes. This is housing designed to perform over time, and designed for long term living.',
      image: robotImg,
      icon: Cpu,
      reverse: false
    },
    {
      tag: 'ZERO-UPFRONT MODEL',
      title: 'FREE BUILD, ALIGNED INCENTIVES',
      description: 'For eligible properties, we fully fund the design and construction of the ADU. Homeowners pay nothing to build. We invest first and only earn when the ADU is complete and generating rental income. Our success is directly tied to how well the unit performs, which keeps incentives aligned from day one.',
      image: freeBuildImg,
      icon: TrendingUp,
      reverse: true
    },
    {
      tag: 'Build, Operate, Share',
      title: 'MANAGED RENTAL PERFORMANCE',
      description: 'Well designed spaces attract better tenants and support long term use. After completion, we continue to operate the ADU as a professionally managed rental. Homeowners stay hands-off, while we handle tenant placement, leasing, and ongoing operations so the unit performs as a long term rental asset.',
      image: rentalImg,
      icon: Zap,
      reverse: false
    },
    {
      tag: 'Earn now. Buy out later.',
      title: 'FLEXIBLE OWNERSHIP',
      description: 'Rental income is shared from day one. As the ADU generates stable returns, homeowners can choose to buy it back and move toward full ownership. Many begin with rental income and later bring the space back for personal or family use. The model is designed to support both paths.',
      image: houseImg,
      icon: Clock,
      reverse: true
    }
  ];

  return (
    <div className="bg-slate-950">
      {features.map((feature, index) => (
        <motion.section
          key={index}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative py-32 overflow-hidden"
        >
          {/* Subtle Background Glow */}
          <div className="absolute inset-0 opacity-30">
            <motion.div
              className={`absolute w-96 h-96 rounded-full blur-3xl ${
                index % 2 === 0 ? 'bg-sky-500/20' : 'bg-blue-500/20'
              }`}
              style={{
                [feature.reverse ? 'left' : 'right']: '-10%',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          <div className="container mx-auto px-8 relative z-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${
              feature.reverse ? 'lg:flex-row-reverse' : ''
            }`}>
              {/* Content Side */}
              <motion.div
                initial={{ opacity: 0, x: feature.reverse ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`space-y-6 ${feature.reverse ? 'lg:order-2' : ''}`}
              >
                {/* Tag */}
                <div className="flex items-center gap-3">
                  <feature.icon className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-bold tracking-wider text-sky-400">
                    {feature.tag}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  {feature.title}
                </h2>

                {/* Description */}
                <p className="text-lg text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>

              {/* Image Side */}
              <motion.div
                initial={{ opacity: 0, x: feature.reverse ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={`relative ${feature.reverse ? 'lg:order-1' : ''}`}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-800">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover aspect-[4/3]"
                  />
                  {/* Image Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                </div>

                {/* Decorative Element */}
                <div className={`absolute -z-10 w-full h-full rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 blur-2xl ${
                  feature.reverse ? '-left-8 -top-8' : '-right-8 -bottom-8'
                }`} />
              </motion.div>
            </div>
          </div>
        </motion.section>
      ))}
    </div>
  );
}
