import React from 'react';
import { Box, Container, Typography, TextField, Button, Paper, Link, Grid } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

const Login = () => {
    return (
        <>

            {/* Login Form */}
            <Box sx={{ py: 8 }}>
                <Container maxWidth="sm">
                    <Paper elevation={4} sx={{ p: 4 }}>
                        <Box sx={{ textAlign: "center", mb: 3 }}>
                            <LockIcon fontSize="large" color="primary" />
                        </Box>
                        <Typography variant="h5" align="center" gutterBottom>
                            Autentificare
                        </Typography>
                        <Box component="form" noValidate sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Adresă de email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Parolă"
                                type="password"
                                id="password"
                                autoComplete="current-password"
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                            >
                                Autentifică-te
                            </Button>
                            <Grid container>
                                <Grid item xs>
                                    <Link href="#" variant="body2">
                                        Ai uitat parola?
                                    </Link>
                                </Grid>
                                <Grid item>
                                    <Link component={RouterLink} to="/register" variant="body2">
                                        {"Nu ai un cont? Înregistrează-te"}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default Login;