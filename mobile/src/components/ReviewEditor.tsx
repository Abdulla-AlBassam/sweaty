import React, { useRef, useState, useCallback } from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'

interface ReviewEditorProps {
  initialValue: string
  onChangeMarkdown: (markdown: string) => void
  maxLength?: number
  placeholder?: string
}

function markdownToHtml(md: string): string {
  if (!md) return ''
  let html = md
  html = html.replace(/\*\*\*(.+?)\*\*\*/gs, '<b><i>$1</i></b>')
  html = html.replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>')
  html = html.replace(/\*(.+?)\*/gs, '<i>$1</i>')
  html = html.replace(/\n/g, '<br>')
  return html
}

function htmlToMarkdown(html: string): string {
  if (!html) return ''
  let md = html
  md = md.replace(/<strong>/gi, '<b>').replace(/<\/strong>/gi, '</b>')
  md = md.replace(/<em>/gi, '<i>').replace(/<\/em>/gi, '</i>')
  md = md.replace(/<b><i>([\s\S]*?)<\/i><\/b>/gi, '***$1***')
  md = md.replace(/<i><b>([\s\S]*?)<\/b><\/i>/gi, '***$1***')
  md = md.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
  md = md.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
  md = md.replace(/<p>/gi, '\n').replace(/<\/p>/gi, '')
  md = md.replace(/<[^>]+>/g, '')
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/&#39;/g, "'")
  md = md.replace(/&nbsp;/g, ' ')
  if (md.startsWith('\n')) md = md.slice(1)
  return md
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function ReviewEditor({
  initialValue,
  onChangeMarkdown,
  maxLength = 2000,
  placeholder = 'Write your thoughts about this game...',
}: ReviewEditorProps) {
  const webViewRef = useRef<WebView>(null)
  const [editorHeight, setEditorHeight] = useState(130)

  const htmlSource = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:transparent}
body{color:#fff;font-family:-apple-system,system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-text-size-adjust:none;display:flex;flex-direction:column}
#editor{outline:none;min-height:80px;flex:1;word-wrap:break-word;-webkit-user-select:text;caret-color:#fff}
#editor:empty::before{content:attr(data-placeholder);color:#6b7280;pointer-events:none}
.tb{display:flex;align-items:center;justify-content:space-between;margin-top:8px;flex-shrink:0}
.fb{display:flex;gap:4px}
.btn{width:32px;height:32px;border-radius:6px;background:#1E1E1E;border:1px solid transparent;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;user-select:none}
.btn.on{background:rgba(224,224,224,0.12);border-color:#E0E0E0}
.bb{font-weight:bold}
.bi{font-style:italic}
.cc{font-size:12px;color:#6b7280}
.cc.over{color:#ef4444}
</style></head><body>
<div id="editor" contenteditable="true" data-placeholder="${escapeAttr(placeholder)}"></div>
<div class="tb"><div class="fb">
<button class="btn bb" id="bB" ontouchstart="event.preventDefault();doB()" onmousedown="event.preventDefault();doB()">B</button>
<button class="btn bi" id="bI" ontouchstart="event.preventDefault();doI()" onmousedown="event.preventDefault();doI()">I</button>
</div><span class="cc" id="cc">0/${maxLength}</span></div>
<script>
var e=document.getElementById('editor'),bB=document.getElementById('bB'),bI=document.getElementById('bI'),cc=document.getElementById('cc'),MX=${maxLength};
var tb=document.querySelector('.tb');
function rpt(){var h=e.innerHTML,t=e.innerText||'',l=t.replace(/\\n$/,'').length;cc.textContent=l+'/'+MX;cc.className='cc'+(l>MX?' over':'');var ch=e.scrollHeight+tb.offsetHeight+8;window.ReactNativeWebView.postMessage(JSON.stringify({t:'c',h:h,l:l,ht:ch}))}
function ub(){bB.classList.toggle('on',document.queryCommandState('bold'));bI.classList.toggle('on',document.queryCommandState('italic'))}
e.addEventListener('input',rpt);
document.addEventListener('selectionchange',ub);
e.addEventListener('paste',function(ev){ev.preventDefault();document.execCommand('insertText',false,ev.clipboardData.getData('text/plain'))});
function doB(){document.execCommand('bold',false,null);ub()}
function doI(){document.execCommand('italic',false,null);ub()}
window.setContent=function(h){e.innerHTML=h;rpt()};
rpt();
</script></body></html>`

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data)
        if (data.t === 'c') {
          setEditorHeight(Math.max(130, (data.ht || 130) + 8))
          onChangeMarkdown(htmlToMarkdown(data.h))
        }
      } catch {}
    },
    [onChangeMarkdown],
  )

  const onLoadEnd = useCallback(() => {
    if (initialValue) {
      const html = markdownToHtml(initialValue)
      webViewRef.current?.injectJavaScript(
        `window.setContent(${JSON.stringify(html)});true;`,
      )
    }
  }, [initialValue])

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlSource }}
      style={[styles.webView, { height: editorHeight }]}
      scrollEnabled={false}
      onMessage={onMessage}
      onLoadEnd={onLoadEnd}
      keyboardDisplayRequiresUserAction={false}
      hideKeyboardAccessoryView
      originWhitelist={['*']}
      javaScriptEnabled
    />
  )
}

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
    minHeight: 130,
  },
})
