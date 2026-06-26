import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName, siteUrl, recipient, confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="zh-Hant" dir="ltr">
    <Head />
    <Preview>確認你的 {siteName} 電子郵件</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>確認你的電子郵件</Heading>
        <Text style={text}>
          感謝你註冊{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
          ！
        </Text>
        <Text style={text}>
          請點擊下方按鈕，以確認你的信箱（
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ）：
        </Text>
        <Button style={button} href={confirmationUrl}>驗證電子郵件</Button>
        <Text style={footer}>若你並未註冊此帳號，可以忽略這封信。</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
