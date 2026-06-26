import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="zh-Hant" dir="ltr">
    <Head />
    <Preview>你受邀加入 {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>你受邀加入</Heading>
        <Text style={text}>
          你受邀加入{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
          。點擊下方按鈕接受邀請並建立帳號。
        </Text>
        <Button style={button} href={confirmationUrl}>接受邀請</Button>
        <Text style={footer}>若你並未預期收到此邀請，可以忽略這封信。</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#FCFBF8', fontFamily: '"Noto Sans TC", Arial, sans-serif' }
const container = { padding: '24px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.7', margin: '0 0 22px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#111', color: '#fff', fontSize: '14px',
  borderRadius: '6px', padding: '12px 20px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#888', margin: '30px 0 0' }
