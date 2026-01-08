import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusMessage } from './StatusMessage'

describe('StatusMessage', () => {
  it('renders info message', () => {
    render(<StatusMessage message="Test message" type="info" />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('renders success message', () => {
    render(<StatusMessage message="Success!" type="success" />)
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<StatusMessage message="Error occurred" type="error" />)
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })
})
