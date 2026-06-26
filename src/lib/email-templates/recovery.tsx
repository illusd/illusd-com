import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="zh-Hant" dir="ltr">
    <Head />
    <Preview>重設你的 {siteName} 密碼</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>重設你的密碼</Heading>
        <Text style={text}>
          我們收到了重設 {siteName} 密碼的請求。請點擊下方按鈕設定新的密碼。
        </Text>
        <Button style={button} href={confirmationUrl}>重設密碼</Button>
        <Text style={footer}>
          若你並未請求重設密碼，可以忽略這封信，你的密碼不會被變更。
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#FCFBF8', fontFamily: '"Noto Sans TC", Arial, sans-serif' }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.7', margin: '0 0 22px' }
const button = {
  backgroundColor: '#111', color: '#fff', fontSize: '14px',
  borderRadius: '6px', padding: '12px 20px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#888', margin: '30px 0 0' }
