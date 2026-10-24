import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'AI Product Office — Your team, in one place',description:'A calm workspace for your AI product team. Plan work, coordinate your team, and make decisions.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
