'use client';
import {useEffect} from 'react';
import {workspaceHtml} from '../lib/workspace-html';
export default function Workspace(){
 useEffect(()=>{if(document.getElementById('workspace-script'))return;const script=document.createElement('script');script.id='workspace-script';script.src='/app.js';document.body.appendChild(script);},[]);
 return <div dangerouslySetInnerHTML={{__html:workspaceHtml}} />;
}
