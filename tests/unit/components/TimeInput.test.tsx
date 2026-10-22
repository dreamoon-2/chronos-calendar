import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TimeInput } from '../../../src/components/ui/TimeInput'

describe('TimeInput', () => {
  it('accepts a colon time immediately', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeInput aria-label="开始时间" value="09:00" onChange={onChange} />)

    const input = screen.getByLabelText('开始时间')
    await user.clear(input)
    await user.type(input, '09:30')

    expect(onChange).toHaveBeenLastCalledWith('09:30')
    expect(input).toHaveValue('09:30')
  })

  it('normalizes four digits to HH:mm on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeInput aria-label="结束时间" value="09:00" onChange={onChange} />)

    const input = screen.getByLabelText('结束时间')
    await user.clear(input)
    await user.type(input, '1030')
    expect(input).toHaveValue('1030')

    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith('10:30')
    expect(input).toHaveValue('10:30')
  })

  it('restores the last valid time when the input is invalid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeInput aria-label="开始时间" value="08:15" onChange={onChange} />)

    const input = screen.getByLabelText('开始时间')
    await user.clear(input)
    await user.type(input, '99')
    await user.tab()

    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveValue('08:15')
  })
})
