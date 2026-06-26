import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="zh-Hant" dir="ltr">
    <Head />
    <Preview>確認 {siteName} 的電子郵件變更</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>確認電子郵件變更</Heading>
        <Text style={text}>
          你請求將 {siteName} 的電子郵件從{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
          變更為{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>。
        </Text>
        <Text style={text}>請點擊下方按鈕確認這項變更：</Text>
        <Button style={button} href={confirmationUrl}>確認變更</Button>
        <Text style={footer}>若你並未請求此項變更，請立即採取措施保護你的帳號。</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
