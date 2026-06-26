import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="zh-Hant" dir="ltr">
    <Head />
    <Preview>你的 {siteName} 登入連結</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>登入 {siteName}</Heading>
        <Text style={text}>點擊下方按鈕即可立即登入。此連結將在短時間內失效。</Text>
        <Button style={button} href={confirmationUrl}>立即登入</Button>
        <Text style={footer}>若你並未請求此連結，可以忽略這封信。</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#FCFBF8', fontFamily: '"Noto Sans TC", Arial, sans-serif' }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.7', margin: '0 0 22px' }
const button = {
  backgroundColor: '#111', color: '#fff', fontSize: '14px',
  borderRadius: '6px', padding: '12px 20px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#888', margin: '30px 0 0' }
