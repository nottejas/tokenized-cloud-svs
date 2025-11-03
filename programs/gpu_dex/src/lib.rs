use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};
use mpl_token_metadata::instructions::{CreateMetadataAccountV3Cpi, CreateMetadataAccountV3CpiAccounts, CreateMetadataAccountV3InstructionArgs};
use mpl_token_metadata::types::DataV2;

declare_id!("7BXzUwxv9aKULu8Jw4sYM9Web2Mg1PNHTrVWwJbiAsxw");

#[program]
pub mod gpu_dex {
    use super::*;

    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.listing_count = 0;
        Ok(())
    }

    pub fn initialize_gpu_mint(_ctx: Context<InitializeGpuMint>) -> Result<()> {
        Ok(())
    }

    pub fn add_gpu_metadata(ctx: Context<AddGpuMetadata>) -> Result<()> {
        let data_v2 = DataV2 {
            name: "GPU Token".to_string(),
            symbol: "gGPU".to_string(),
            uri: "https://raw.githubusercontent.com/nottejas/gpu-token-metadata/refs/heads/main/gpu-token.json".to_string(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        CreateMetadataAccountV3Cpi::new(
            &ctx.accounts.token_metadata_program,
            CreateMetadataAccountV3CpiAccounts {
                metadata: &ctx.accounts.metadata,
                mint: &ctx.accounts.gpu_mint.to_account_info(),
                mint_authority: &ctx.accounts.mint_authority,
                payer: &ctx.accounts.authority.to_account_info(),
                update_authority: (&ctx.accounts.authority.to_account_info(), true),
                system_program: &ctx.accounts.system_program,
                rent: Some(&ctx.accounts.rent.to_account_info()),
            },
            CreateMetadataAccountV3InstructionArgs {
                data: data_v2,
                is_mutable: true,
                collection_details: None,
            },
        )
        .invoke_signed(&[&[
            b"mint-authority",
            &[ctx.bumps.mint_authority],
        ]])?;

        Ok(())
    }

    pub fn mint_gpu_tokens(
        ctx: Context<MintGpuTokens>,
        amount: u64,
    ) -> Result<()> {
        let seeds = &[
            b"mint-authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.gpu_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn create_listing(
        ctx: Context<CreateListing>,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        // Validate inputs
        require!(price > 0, ErrorCode::InvalidPrice);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(amount >= 1_000_000, ErrorCode::AmountTooSmall); // Min 0.001 tokens

        let listing = &mut ctx.accounts.listing;
        let marketplace = &mut ctx.accounts.marketplace;

        listing.seller = ctx.accounts.seller.key();
        listing.price = price;
        listing.amount = amount;
        listing.is_active = true;
        listing.listing_id = marketplace.listing_count;

        marketplace.listing_count += 1;

        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn buy_listing(
        ctx: Context<BuyListing>,
        amount: u64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;

        require!(listing.is_active, ErrorCode::ListingNotActive);
        require!(amount <= listing.amount, ErrorCode::InsufficientAmount);

        let total_price = (listing.price as u128)
            .checked_mul(amount as u128)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(1_000_000_000)
            .ok_or(ErrorCode::Overflow)? as u64;

        {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &listing.seller,
                total_price,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.seller_sol_account.to_account_info(),
                ],
            )?;
        }

        let listing_seller = listing.seller;
        let listing_id_le = listing.listing_id.to_le_bytes();

        let seeds = &[
            b"listing",
            listing_seller.as_ref(),
            &listing_id_le,
            &[ctx.bumps.listing],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: listing.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        listing.amount = listing
            .amount
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;
        if listing.amount == 0 {
            listing.is_active = false;
        }

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.is_active, ErrorCode::ListingNotActive);

        let listing_seller = listing.seller;
        let listing_id_le = listing.listing_id.to_le_bytes();

        let seeds = &[
            b"listing",
            listing_seller.as_ref(),
            &listing_id_le,
            &[ctx.bumps.listing],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: listing.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, listing.amount)?;

        listing.is_active = false;
        listing.amount = 0;
        Ok(())
    }

    pub fn close_listing(ctx: Context<CloseListing>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(!listing.is_active, ErrorCode::ListingStillActive);
        require!(listing.amount == 0, ErrorCode::ListingHasTokens);
        Ok(())
    }
}

// Account Contexts

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [b"marketplace"],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeGpuMint<'info> {
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = mint_authority,
        seeds = [b"gpu-mint"],
        bump
    )]
    pub gpu_mint: Account<'info, Mint>,
    /// CHECK: PDA used as mint authority, validated by seeds constraint
    #[account(seeds = [b"mint-authority"], bump)]
    pub mint_authority: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddGpuMetadata<'info> {
    #[account(mut, seeds = [b"gpu-mint"], bump)]
    pub gpu_mint: Account<'info, Mint>,
    /// CHECK: Metadata account created by Metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: PDA used as mint authority, validated by seeds constraint
    #[account(seeds = [b"mint-authority"], bump)]
    pub mint_authority: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: Metaplex Token Metadata Program
    pub token_metadata_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct MintGpuTokens<'info> {
    #[account(mut, seeds = [b"gpu-mint"], bump)]
    pub gpu_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA used as mint authority, validated by seeds constraint
    #[account(seeds = [b"mint-authority"], bump)]
    pub mint_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", seller.key().as_ref(), &marketplace.listing_count.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut, seeds = [b"marketplace"], bump)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        init,
        payer = seller,
        token::mint = gpu_mint,
        token::authority = listing,
        seeds = [b"escrow", listing.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub gpu_mint: Account<'info, Mint>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.seller.as_ref(), &listing.listing_id.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [b"escrow", listing.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Seller's SOL account for receiving payment
    #[account(mut)]
    pub seller_sol_account: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref(), &listing.listing_id.to_le_bytes()],
        bump,
        has_one = seller
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [b"escrow", listing.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseListing<'info> {
    #[account(
        mut,
        close = seller,
        seeds = [b"listing", seller.key().as_ref(), &listing.listing_id.to_le_bytes()],
        bump,
        has_one = seller
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
}

// Data Structures

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub listing_count: u64,
}

impl Marketplace {
    pub const INIT_SPACE: usize = 32 + 8;
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub price: u64,
    pub amount: u64,
    pub is_active: bool,
    pub listing_id: u64,
}

impl Listing {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 1 + 8;
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Listing is not active")]
    ListingNotActive,
    #[msg("Insufficient amount in listing")]
    InsufficientAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Listing is still active")]
    ListingStillActive,
    #[msg("Listing still has tokens")]
    ListingHasTokens,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Amount too small, minimum 0.001 tokens")]
    AmountTooSmall,
}
