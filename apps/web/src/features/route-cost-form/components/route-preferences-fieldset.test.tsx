import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RoutePreferencesFieldset } from './route-preferences-fieldset';

function makeRegistration() {
  return {
    name: 'field',
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  };
}

describe('RoutePreferencesFieldset', () => {
  it('renders native radios for priority and native checkboxes for avoidance', () => {
    render(
      <RoutePreferencesFieldset
        priorityRegistration={makeRegistration()}
        avoidanceRegistrations={{
          avoidTolls: makeRegistration(),
          avoidMotorways: makeRegistration(),
          avoidFerries: makeRegistration(),
        }}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Route preferences' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Route priority' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Fastest' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Shortest' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Avoid toll roads' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Avoid motorways' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Avoid ferries' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Route preferences influence route selection, but a returned route may still include an avoided feature when no reasonable alternative is available.',
      ),
    ).toBeInTheDocument();
  });

  it('allows toggling every checkbox through its tappable label', async () => {
    const user = userEvent.setup();
    const registrations = {
      avoidTolls: makeRegistration(),
      avoidMotorways: makeRegistration(),
      avoidFerries: makeRegistration(),
    };

    render(
      <RoutePreferencesFieldset
        priorityRegistration={makeRegistration()}
        avoidanceRegistrations={registrations}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', { name: 'Avoid toll roads' }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Avoid motorways' }));
    await user.click(screen.getByRole('checkbox', { name: 'Avoid ferries' }));

    expect(registrations.avoidTolls.onChange).toHaveBeenCalled();
    expect(registrations.avoidMotorways.onChange).toHaveBeenCalled();
    expect(registrations.avoidFerries.onChange).toHaveBeenCalled();
  });

  it('supports keyboard interaction on radios and checkboxes', async () => {
    const user = userEvent.setup();
    const priorityRegistration = makeRegistration();

    render(
      <RoutePreferencesFieldset
        priorityRegistration={priorityRegistration}
        avoidanceRegistrations={{
          avoidTolls: makeRegistration(),
          avoidMotorways: makeRegistration(),
          avoidFerries: makeRegistration(),
        }}
      />,
    );

    const shortest = screen.getByRole('radio', { name: 'Shortest' });
    await user.tab();
    await user.keyboard('{ArrowDown}');

    expect(shortest).toHaveFocus();
    expect(priorityRegistration.onChange).toHaveBeenCalled();
  });

  it('links labels to inputs so clicking label text toggles the control', async () => {
    const user = userEvent.setup();
    const registrations = {
      avoidTolls: makeRegistration(),
      avoidMotorways: makeRegistration(),
      avoidFerries: makeRegistration(),
    };

    render(
      <RoutePreferencesFieldset
        priorityRegistration={makeRegistration()}
        avoidanceRegistrations={registrations}
      />,
    );

    await user.click(screen.getByText('Avoid ferries'));

    expect(registrations.avoidFerries.onChange).toHaveBeenCalled();
  });

  it('does not impose outer margins on the consuming layout', () => {
    const { container } = render(
      <RoutePreferencesFieldset
        priorityRegistration={makeRegistration()}
        avoidanceRegistrations={{
          avoidTolls: makeRegistration(),
          avoidMotorways: makeRegistration(),
          avoidFerries: makeRegistration(),
        }}
      />,
    );

    const fieldset = container.querySelector('fieldset');
    expect(fieldset?.className).not.toContain('m-');
    expect(fieldset?.className).not.toContain('mx-');
    expect(fieldset?.className).not.toContain('my-');
  });
});
