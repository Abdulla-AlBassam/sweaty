import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface ReviewEditorModalProps {
  visible: boolean
  onClose: () => void
  onSave: (markdown: string) => void
  initialValue: string
  maxLength?: number
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
  md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  if (md.startsWith('\n')) md = md.slice(1)
  return md
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function ReviewEditorModal({
  visible,
  onClose,
  onSave,
  initialValue,
  maxLength = 2000,
}: ReviewEditorModalProps) {
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<WebView>(null)
  const [currentMarkdown, setCurrentMarkdown] = useState(initialValue)
  const [textLength, setTextLength] = useState(0)
  const [boldActive, setBoldActive] = useState(false)
  const [italicActive, setItalicActive] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const isOverLimit = textLength > maxLength

  // Track keyboard height directly (KeyboardAvoidingView unreliable in pageSheet)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    )
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0))
    return () => { showSub.remove(); hideSub.remove() }
  }, [])

  const placeholder = 'Write your thoughts about this game...'

  const htmlSource = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#0f0f0f;overflow:hidden}
body{color:#fff;font-family:-apple-system,system-ui,sans-serif;-webkit-text-size-adjust:none}
#editor{height:100%;outline:none;padding:16px;font-size:16px;line-height:1.6;overflow-y:auto;-webkit-overflow-scrolling:touch;-webkit-user-select:text;word-wrap:break-word;caret-color:#fff}
#editor:empty::before{content:attr(data-placeholder);color:#6b7280;pointer-events:none}
</style></head><body>
<div id="editor" contenteditable="true" data-placeholder="${escapeAttr(placeholder)}"></div>
<script>
var e=document.getElementById('editor'),savedRange=null;
function rpt(){var h=e.innerHTML,t=e.innerText||'',l=t.replace(/\\n$/,'').length;window.ReactNativeWebView.postMessage(JSON.stringify({t:'c',h:h,l:l}))}
function fs(){window.ReactNativeWebView.postMessage(JSON.stringify({t:'f',b:document.queryCommandState('bold'),i:document.queryCommandState('italic')}))}
e.addEventListener('input',rpt);
document.addEventListener('selectionchange',function(){fs();var s=window.getSelection();if(s.rangeCount>0)savedRange=s.getRangeAt(0).cloneRange()});
e.addEventListener('paste',function(ev){ev.preventDefault();document.execCommand('insertText',false,ev.clipboardData.getData('text/plain'))});
window.applyCmd=function(cmd){e.focus();if(savedRange){var s=window.getSelection();s.removeAllRanges();s.addRange(savedRange)}document.execCommand(cmd,false,null);fs();rpt()};
window.setContent=function(h){e.innerHTML=h;rpt();e.focus()};
rpt();
</script></body></html>`

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.t === 'c') {
        setTextLength(data.l)
        setCurrentMarkdown(htmlToMarkdown(data.h))
      } else if (data.t === 'f') {
        setBoldActive(data.b)
        setItalicActive(data.i)
      }
    } catch {}
  }, [])

  const onLoadEnd = useCallback(() => {
    const html = initialValue ? markdownToHtml(initialValue) : ''
    webViewRef.current?.injectJavaScript(
      `window.setContent(${JSON.stringify(html)});true;`,
    )
  }, [initialValue])

  const handleBold = useCallback(() => {
    webViewRef.current?.injectJavaScript(`window.applyCmd('bold');true;`)
  }, [])

  const handleItalic = useCallback(() => {
    webViewRef.current?.injectJavaScript(`window.applyCmd('italic');true;`)
  }, [])

  const handleDone = useCallback(() => {
    onSave(currentMarkdown)
  }, [currentMarkdown, onSave])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtnLeft}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review</Text>
          <TouchableOpacity
            onPress={handleDone}
            style={styles.headerBtnRight}
            disabled={isOverLimit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.doneText, isOverLimit && styles.doneTextDisabled]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Editor */}
        <WebView
          ref={webViewRef}
          source={{ html: htmlSource }}
          style={styles.webView}
          scrollEnabled={false}
          onMessage={onMessage}
          onLoadEnd={onLoadEnd}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
          originWhitelist={['*']}
          javaScriptEnabled
        />

        {/* Toolbar -- pushed up by keyboard spacer below */}
        <View style={styles.toolbar}>
          <View style={styles.fmtRow}>
            <Pressable
              onPress={handleBold}
              style={[styles.fmtBtn, boldActive && styles.fmtBtnActive]}
            >
              <Text style={[styles.fmtBtnText, styles.fmtBold, boldActive && styles.fmtBtnTextActive]}>B</Text>
            </Pressable>
            <Pressable
              onPress={handleItalic}
              style={[styles.fmtBtn, italicActive && styles.fmtBtnActive]}
            >
              <Text style={[styles.fmtBtnText, styles.fmtItalic, italicActive && styles.fmtBtnTextActive]}>I</Text>
            </Pressable>
          </View>
          <Text style={[styles.charCount, isOverLimit && styles.charCountOver]}>
            {textLength}/{maxLength}
          </Text>
        </View>

        {/* Keyboard spacer */}
        <View style={{ height: keyboardHeight }} />
      </View>
    </Modal>
  )
}

const CREAM = Colors.cream

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBtnLeft: {
    minWidth: 60,
  },
  headerBtnRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  cancelText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  doneText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: CREAM,
  },
  doneTextDisabled: {
    opacity: 0.3,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0f0f0f',
  },
  fmtRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fmtBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(192, 200, 208, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192, 200, 208, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fmtBtnActive: {
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderColor: CREAM,
  },
  fmtBtnText: {
    fontSize: 17,
    color: 'rgba(192, 200, 208, 0.6)',
  },
  fmtBtnTextActive: {
    color: CREAM,
  },
  fmtBold: {
    fontWeight: '700',
  },
  fmtItalic: {
    fontStyle: 'italic',
  },
  charCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  charCountOver: {
    color: '#ef4444',
  },
})
