import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Thesis — Investment workspace',description:'Define investment theses and discover companies aligned to your point of view.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><head><link rel="stylesheet" href="/styles.css" /></head><body>{children}</body></html>;
}
