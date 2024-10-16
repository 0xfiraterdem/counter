use anchor_lang::prelude::*;
use anchor_lang::prelude::ProgramError;

declare_id!("HK6pq31qYDZPQAu2yYAa29njYRMngVDPDKBgEdA9NZJn");

#[program]
pub mod counter {
    use super::*;

    pub fn increase_counter(mut ctx: Context<ManageCounter>, step: u64) -> Result<()> {
        if ctx.accounts.counter.to_account_info().data_is_empty() {
            initialize_counter(&mut ctx)?;
        }

        let counter = &mut ctx.accounts.counter;

        msg!("Increasing counter by {}...", step);
        counter.count += step;
        msg!("Counter successfully increased. New value: {}", counter.count);

        Ok(())
    }

    pub fn decrease_counter(mut ctx: Context<ManageCounter>, step: u64) -> Result<()> {
        if ctx.accounts.counter.to_account_info().data_is_empty() {
            initialize_counter(&mut ctx)?;
        }

        let counter = &mut ctx.accounts.counter;

        if counter.count >= step {
            msg!("Decreasing counter by {}...", step);
            counter.count -= step;
            msg!("Counter successfully decreased. New value: {}", counter.count);
        } else {
            msg!("Cannot decrease counter below 0. Current value: {}", counter.count);
            return Err(ProgramError::InvalidArgument.into());
        }

        Ok(())
    }
}

fn initialize_counter(ctx: &mut Context<ManageCounter>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;

    msg!("Initializing counter with value 0...");
    counter.authority = *ctx.accounts.authority.key;
    counter.count = 0;
    msg!("Counter initialized.");

    Ok(())
}

#[derive(Accounts)]
pub struct ManageCounter<'info> {
    #[account(
        init_if_needed,
        seeds = [b"counter", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + std::mem::size_of::<Counter>(),
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
}
