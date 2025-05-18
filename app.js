const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const registerRouter = require('./routes/register');
const loginRouter = require('./routes/login');
const usersRouter = require('./routes/users');
const artistsRouter = require('./routes/artists');
const stripeRouter = require('./routes/stripe');
const citiesRouter = require('./routes/cities');
const tattoosRouter = require('./routes/tattoos');
const bookingStatusesRouter = require('./routes/bookingStatuses');
const stylesRouter = require('./routes/styles');
const placementsRouter = require('./routes/placements');
const appointmentsRouter = require('./routes/appointments');
const favoritesRouter = require('./routes/favorites');
const sizesRouter = require('./routes/sizes');
const bookingsRouter = require('./routes/bookings');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/users', usersRouter);
app.use('/artists', artistsRouter);
app.use('/stripe', stripeRouter);
app.use('/cities', citiesRouter);
app.use('/tattoos', tattoosRouter);
app.use('/bookingStatuses', bookingStatusesRouter);
app.use('/styles', stylesRouter);
app.use('/placements', placementsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/favorites', favoritesRouter);
app.use('/sizes', sizesRouter);
app.use('/bookings', bookingsRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
