import React, { useState } from 'react';
import Navbar from '../../components/sections/Navbar/Navbar';
import { Box, Container, Typography, TextField, Button, Paper, Link, Alert } from '@mui/material';
import Grid from "@mui/material/Grid2";
import { Lock as LockIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const apiClient = axios.create({
        timeout: 2000,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!username.trim() || !password.trim()) {
            setError('Te rugăm să completezi toate câmpurile');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('http://127.0.0.1:8000/api/login/', {
                username,
                password
            });

            // Stocare token în localStorage - procesare paralelă
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
            localStorage.setItem('userId', response.data.user_id);
            
            navigate('/dashboard');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Autentificare eșuată';
            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <>
            {/* Navbar */}
            <Navbar />         
            {/* Login Form */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '100vh',
                }}
            >
                <Container maxWidth="sm">
                    <Paper elevation={4} sx={{ p: 4 }}>
                        <Box sx={{ textAlign: "center", mb: 3 }}>
                            <LockIcon fontSize="large" color="primary" />
                        </Box>
                        <Typography variant="h5" align="center" gutterBottom>
                            Autentificare
                        </Typography>
                        
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        
                        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Nume de utilizator"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                inputProps={{ maxLength: 50 }}
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
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                inputProps={{ maxLength: 50 }}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                disabled={loading}
                            >
                                {loading ? 'Se procesează...' : 'Autentifică-te'}
                            </Button>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <Link component={RouterLink} to="/forgot-password" variant="body2">
                                        Ai uitat parola?
                                    </Link>
                                </Grid>
                                <Grid xs={6} sx={{ textAlign: 'right' }}>
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