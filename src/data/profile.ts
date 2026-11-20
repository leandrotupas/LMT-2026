// Public wording verified against PORTFOLIO 2026 and the approved content inventory.
export const profile = {
  name: 'Yancy Tupas',
  role: 'Graphic & Brand Designer',
  location: 'Davao City, Philippines',
  statement: 'I like making things that feel intentional, expressive, and unmistakably themselves.',
  introduction: 'I’m a brand and graphic designer based in Davao, Philippines. I build identities, shape stories and give everyday communication a clear point of view.',
  aboutHeading: 'A little more Yancy.',
  experience: [
    {
      organization: 'Independent',
      role: 'Freelance Brand & Graphic Designer',
      period: '2021–Present',
      projectSlugs: ['advenient', 'kota-center-davao'],
    },
    {
      organization: 'Design.com',
      role: 'In-House Designer',
      period: 'Apr 2025 – Oct 2026',
      note: 'Social graphics, logos, brochures and posters for small businesses.',
      projectSlugs: [],
    },
    {
      organization: 'Brickroad Studios',
      role: 'Freelance Graphic Designer (Contract)',
      period: 'Dec 2024 – Jun 2026',
      projectSlugs: ['wunderbar', 'uxph'],
    },
    {
      organization: 'SUM Digital',
      role: 'Graphic Design Intern',
      period: 'Jul 2024 – Dec 2024',
      projectSlugs: ['doorless', 'move-to-happiness'],
    },
  ],
  education: {
    degree: 'Bachelor of Science in Computer Science',
    institution: 'Ateneo de Davao University',
    period: '2020–2024',
    note: 'I designed event identities with the SAMAHAN Creative Team, first as a graphic designer and later as deputy director.',
  },
  skills: ['Graphic Design', 'Brand Design', 'Visual Communication', 'Creative Thinking', 'Art Direction', 'Typography', 'Visual Storytelling'],
  tools: ['Adobe Illustrator', 'Adobe Photoshop', 'Adobe InDesign', 'Figma', 'Canva'],
  resume: { href: '/portfolio/yancy-tupas-resume.pdf', pages: 2 },
  availability: 'Open to full-time, freelance and contract work. Remote-friendly.',
  email: 'tupas.leandro.lt@gmail.com',
  socialProfiles: [
    { name: 'Behance', url: 'https://www.behance.net/leandrotupas' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/lmbtupas/' },
  ],
} as const;
