import { readFile, access } from 'node:fs/promises';
const required = ['app/_layout.tsx','app/onboarding.tsx','app/(tabs)/index.tsx','app/(tabs)/production.tsx','app/(tabs)/impact.tsx','app/(tabs)/help.tsx','app/piece/new.tsx','app/piece/[id].tsx','app/identify.tsx','src/context/AppContext.tsx','src/lib/pi5.ts'];
for (const path of required) await access(new URL(`../${path}`, import.meta.url));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!pkg.dependencies?.expo || !pkg.dependencies?.['expo-sqlite'] || !pkg.dependencies?.['expo-image-picker']) throw new Error('Dependências móveis incompletas');
console.log(`PHYLLOS Mobile validada: ${required.length} módulos essenciais presentes.`);
